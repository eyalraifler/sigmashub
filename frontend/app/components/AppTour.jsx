"use client";
import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';

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

    const handleCallback = async (data) => {
        const { status } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            await fetch('http://127.0.0.1:8000/api/users/complete_tour', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getCookie("access_token")}`,
                },
            });
        }
    };

    return (
        <Joyride
        key={tourKey}
        steps={steps}
        run={run}
        continuous={true}
        callback={handleCallback}
        options={{ skipBeacon: true, buttons: ["back", "close", "primary", "skip"] }}
        styles={{
            options: {
                zIndex: 10000,
                primaryColor: "#ffffff",
                textColor: "#000000",
            },
        }}
        />
    );
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : "";
}
