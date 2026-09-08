from __future__ import annotations

from dataclasses import dataclass
import httpx

from app.core.config import get_settings


@dataclass
class SMSResult:
    provider: str
    status: str
    provider_message_id: str | None = None
    error: str | None = None


class SMSProvider:
    async def send(self, phone: str, message: str) -> SMSResult:
        raise NotImplementedError


class DisabledSMSProvider(SMSProvider):
    async def send(self, phone: str, message: str) -> SMSResult:
        return SMSResult(provider="disabled", status="disabled", error="SMS provider is not configured")


class MSG91Provider(SMSProvider):
    async def send(self, phone: str, message: str) -> SMSResult:
        s = get_settings()
        if not (s.msg91_auth_key and s.msg91_template_id):
            return SMSResult(provider="msg91", status="failed", error="MSG91 credentials/template are incomplete")
        payload = {
            "template_id": s.msg91_template_id,
            "short_url": "0",
            "recipients": [{"mobiles": phone, "VAR1": message[:120]}],
        }
        headers = {"authkey": s.msg91_auth_key, "content-type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post("https://control.msg91.com/api/v5/flow/", json=payload, headers=headers)
            if response.is_success:
                data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return SMSResult(provider="msg91", status="sent", provider_message_id=str(data.get("request_id") or "") or None)
            return SMSResult(provider="msg91", status="failed", error=f"HTTP {response.status_code}: {response.text[:300]}")
        except Exception as exc:
            return SMSResult(provider="msg91", status="failed", error=str(exc))


class TwilioProvider(SMSProvider):
    async def send(self, phone: str, message: str) -> SMSResult:
        s = get_settings()
        if not (s.twilio_account_sid and s.twilio_auth_token and s.twilio_from_number):
            return SMSResult(provider="twilio", status="failed", error="Twilio credentials are incomplete")
        url = f"https://api.twilio.com/2010-04-01/Accounts/{s.twilio_account_sid}/Messages.json"
        data = {"To": phone, "From": s.twilio_from_number, "Body": message}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(url, data=data, auth=(s.twilio_account_sid, s.twilio_auth_token))
            if response.is_success:
                body = response.json()
                return SMSResult(provider="twilio", status="sent", provider_message_id=body.get("sid"))
            return SMSResult(provider="twilio", status="failed", error=f"HTTP {response.status_code}: {response.text[:300]}")
        except Exception as exc:
            return SMSResult(provider="twilio", status="failed", error=str(exc))


def get_sms_provider() -> SMSProvider:
    provider = get_settings().sms_provider.lower()
    if provider == "msg91":
        return MSG91Provider()
    if provider == "twilio":
        return TwilioProvider()
    return DisabledSMSProvider()
