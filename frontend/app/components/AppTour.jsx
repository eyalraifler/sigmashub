"use client";

import { TourProvider, useTour } from 'modern-tour';
import 'modern-tour';
import { useEffect } from 'react';
import { getAccessToken } from '../lib/auth';

const steps = [
  {
    target: '#create-link',
    title: 'Create Post',
    content: 'Click here to create a new post!',
    position: 'right'
  },
  {
    target: '#search-link',
    content: 'Search for other users and posts here.',
    position: 'right'
  },
  {
    target: '#profile-link',
    content: 'View and edit your profile here.',
    position: 'right'
  },
  {
    target: '#notifications-link',
    content: 'See your notifications here.',
    position: 'right'
  }
];

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

function TourRestartListener() {
    const { start } = useTour();

    useEffect(() => {
        const handler = () => start();
        window.addEventListener("startTour", handler);
        return () => window.removeEventListener("startTour", handler);
    }, [start]);

    return null;
}

export default function AppTour({ initialRun = false }) {
    return (
        <TourProvider options={{
            steps,
            autoStart: initialRun,
            animation: 'smooth',
            labels: {
                next: 'Continue',
                prev: 'Back',
                finish: 'Got it!',
                skip: 'Skip Tour'
            },
            onEnd: markTourComplete,
        }}>
            <TourRestartListener />
        </TourProvider>
    );
}
