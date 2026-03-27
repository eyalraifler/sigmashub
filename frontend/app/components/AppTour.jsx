"use client";
import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { getAccessToken } from '../lib/auth';

const steps = [
  { target: '#create-link',        content: 'Click here to create a new post!' },
  { target: '#search-link',        content: 'Search for other users and posts here.' },
  { target: '#profile-link',       content: 'View and edit your profile here.' },
  { target: '#notifications-link', content: 'See your notifications here.' },
];

export default function AppTour({ initialRun = false }) {
    const [run, setRun] = useState(initialRun);
    const [tourKey, setTourKey] = useState(0);

    useEffect(() => {
        if (initialRun) {
            markTourComplete();
        }
    }, []);

    useEffect(() => {
        const handler = () => {
            setRun(false);
            setTimeout(() => {
                setTourKey(k => k + 1);
                setRun(true);
            }, 50);
        };
        window.addEventListener("startTour", handler);
        return () => window.removeEventListener("startTour", handler);
    }, []);

    const markTourComplete = async () => {
        const token = getAccessToken();
        if (!token) return;
        try {
            await fetch('http://127.0.0.1:8000/api/users/complete_tour', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error('Failed to mark tour complete:', e);
        }
    };

    useEffect(() => {
        if (!run) return;
        const origFocus = HTMLElement.prototype.focus;
        HTMLElement.prototype.focus = function(options) {
            origFocus.call(this, { ...options, preventScroll: true });
        };
        return () => { HTMLElement.prototype.focus = origFocus; };
    }, [run]);

    useEffect(() => {
        if (!run) return;
        const scrollY = window.scrollY;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollY);
        };
    }, [run]);

    const handleCallback = async (data) => {
        const { status } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            await markTourComplete();
        }
    };

    return (
        <Joyride
        key={tourKey}
        steps={steps}
        run={run}
        continuous={true}
        callback={handleCallback}
        disableScrolling={true}
        disableOverlayClose={true}
        spotlightClicks={false}
        options={{ skipBeacon: true, buttons: ["back", "close", "primary", "skip"] }}
        styles={{
            options: {
                zIndex: 10000,
                primaryColor: "#ffffff",
                textColor: "#000000",
                overlayColor: "rgba(0, 0, 0, 0.7)",
            },
        }}
        />
    );
}
