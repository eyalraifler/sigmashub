"use client";

import { TourProvider, useTour } from 'modern-tour';
import 'modern-tour';
import { useEffect, useState } from 'react';
//import { Joyride, STATUS } from 'react-joyride';
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


const steps2 = [
  { target: '#create-link',        content: 'Click here to create a new post!' },
  { target: '#search-link',        content: 'Search for other users and posts here.' },
  { target: '#profile-link',       content: 'View and edit your profile here.' },
  { target: '#notifications-link', content: 'See your notifications here.' },
];


// Step 3: Trigger the tour
function MyApp() {
  const { start } = useTour();
  
  return (
    <button onClick={() => start()}>
      Start Tour
    </button>
  );
}

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

    {/* useEffect(() => {
        if (!run) return;
        const origFocus = HTMLElement.prototype.focus;
        HTMLElement.prototype.focus = function(options) {
            origFocus.call(this, { ...options, preventScroll: true });
        };
        return () => { HTMLElement.prototype.focus = origFocus; };
    }, [run]);

    useEffect(() => {
        if (!run) {
            document.body.style.overflow = '';
            return;
        }
        const origFocus = HTMLElement.prototype.focus;
        const origScrollIntoView = Element.prototype.scrollIntoView;
        document.body.style.overflow = 'hidden';
        HTMLElement.prototype.focus = function(options) {
            origFocus.call(this, { ...options, preventScroll: true });
        };
        Element.prototype.scrollIntoView = function() {};
        return () => {
            HTMLElement.prototype.focus = origFocus;
            Element.prototype.scrollIntoView = origScrollIntoView;
            document.body.style.overflow = '';
        };
    }, [run]);

    const handleCallback = async (data) => {
        const { status } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            await markTourComplete();
        }
    };*/}

    return (
        <TourProvider class="neo-theme" options={{ 
            steps, 
            animation: 'smooth',
            labels: {
                next: 'Continue',
                prev: 'Back',
                finish: 'Got it!',
                skip: 'Skip Tour'

            }
              }}>
            <MyApp />
        </TourProvider>
    );
}
