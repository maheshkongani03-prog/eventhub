import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleButton({ onCredential }) {
  const holder = useRef(null);
  const latest = useRef(onCredential);

  useEffect(() => {
    latest.current = onCredential;
  });

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let timer;

    function render() {
      if (!window.google || !holder.current) return false;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => latest.current(response.credential),
      });
      window.google.accounts.id.renderButton(holder.current, {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(350, window.innerWidth - 100),
      });
      return true;
    }

    if (!render()) {
      timer = setInterval(() => {
        if (render()) clearInterval(timer);
      }, 200);
    }
    return () => clearInterval(timer);
  }, []);

  if (!CLIENT_ID) return null;
  return <div ref={holder} className="google-btn" />;
}