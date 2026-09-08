from typing import Literal


def detect_emergency_intent(transcript: str) -> bool:
    """
    Detects if a transcribed audio segment expresses an emergency situation
    in either English or Tamil.
    """
    if not transcript:
        return False
    t = transcript.lower().strip()

    english_emergency_keywords = [
        "danger",
        "help",
        "emergency",
        "flood",
        "water rising",
        "trapped",
        "rescue",
        "fire",
        "cyclone",
        "landslide",
        "send help",
        "save me",
        "urgent",
    ]

    tamil_emergency_keywords = [
        "உதவி",
        "ஆபத்து",
        "காப்பாற்றுங்கள்",
        "வெள்ளம்",
        "சிக்கிக்கொண்டேன்",
        "உயிர் ஆபத்து",
        "அவசரம்",
        "தீ",
    ]

    for kw in english_emergency_keywords:
        if kw in t:
            return True

    for kw in tamil_emergency_keywords:
        if kw in transcript:
            return True

    return False


def detect_safety_status(transcript: str) -> Literal["SAFE", "NEED_HELP", "AT_SHELTER", "UNABLE_TO_MOVE"] | None:
    """
    Maps an English or Tamil voice safety update transcript to a standard status.
    """
    if not transcript:
        return None
    t = transcript.lower().strip()

    # Check unable to move first
    if any(k in t for k in ["cannot move", "can't move", "unable to move", "trapped", "immobile", "stuck"]) or any(
        k in transcript for k in ["நகர முடியவில்லை", "நகர இயலவில்லை", "நகர முடியாது", "சிக்கிவிட்டேன்"]
    ):
        return "UNABLE_TO_MOVE"

    # Check at shelter
    if any(k in t for k in ["shelter", "camp", "relief center", "at shelter", "refuge"]) or any(
        k in transcript for k in ["முகாம்", "முகாமில்", "நிவாரண மையம்", "தங்குமிடம்"]
    ):
        return "AT_SHELTER"

    # Check need help
    if any(k in t for k in ["need help", "in danger", "help me", "send help", "injured", "pain"]) or any(
        k in transcript for k in ["உதவி வேண்டும்", "எனக்கு உதவி வேண்டும்", "ஆபத்து", "காப்பாற்றுங்கள்"]
    ):
        return "NEED_HELP"

    # Check safe
    if any(k in t for k in ["safe", "i am safe", "fine", "okay", "secure", "all good"]) or any(
        k in transcript for k in ["பாதுகாப்பாக", "பாதுகாப்பு", "நன்றாக இருக்கிறேன்", "நலமாக உள்ளேன்"]
    ):
        return "SAFE"

    return None
