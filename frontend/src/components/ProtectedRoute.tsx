import {Navigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {Loading} from './Loading';
export function ProtectedRoute({children}:{children:React.ReactNode}){const {user,loading}=useAuth();if(loading)return <Loading label="Loading session…"/>;if(!user)return <Navigate to="/login" replace/>;return <>{children}</>}
