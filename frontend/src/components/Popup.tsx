import { useEffect, useState } from "react";
import CloseIcon from "../assets/images/close-icon.svg?react";

function Popup({message, duration=5000, onClose, visible}: {message: string, duration?: number, onClose?: () => void, visible?: boolean}) {
    const [internalVisible, setInternalVisible] = useState(true);
    console.log(`visibility: ${visible !==undefined && !visible}`)
    console.log(`visible: ${visible}`)
    useEffect(() => {
    const timer = setTimeout(() => {
        if (visible === undefined) setInternalVisible(false);
        onClose?.();
    }, duration);
    return () => clearTimeout(timer);   // cancel if unmounted early
    }, [duration, visible, onClose]);

    return <div className={`popup ${(visible === undefined && internalVisible || visible !==undefined && visible)? "visible": ""}`}>
                <p style={{color: "#e5e3e3"}}>{message}</p><CloseIcon style={{cursor: "pointer"}} color="#e5e3e3" height="20px" width="15px" onClick={() => {if(onClose){onClose(); if (visible === undefined) {setInternalVisible(false)} }else{if (visible === undefined) {setInternalVisible(false)}}}}/>
            </div>
}
export default Popup;