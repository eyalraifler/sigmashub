"use client";
import { Joyride, STATUS } from 'react-joyride';
const steps = [
  { target: '#create-link',        content: 'Click here to create a new post!' },
  { target: '#search-link',        content: 'Search for other users and posts here.' },
  { target: '#profile-link',       content: 'View and edit your profile here.' },
  { target: '#notifications-link', content: 'See your notifications here.' },
];


export default function AppTour({ userId }) {
    const handleEvent = async (data) => {
        console.log("Tour event:", data);
        const { status } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            await fetch('http://127.0.0.1:8000/api/users/complete_tour', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getCookie("access_token")}`,
                },
            });
        }
    }

    return (
        <Joyride
        steps={steps}
        run={true}
        continuous={true}
        onEvent={handleEvent}
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