export const GA_TRACKING_ID = 'G-VF27R8XBMY';

/**
 * Log a specific event to Google Analytics.
 * @param action The action performed (e.g., 'click', 'submit')
 * @param category The category of the event (e.g., 'engagement', 'interaction')
 * @param label The label for the event (e.g., station name, line name)
 * @param value An optional numeric value (e.g., distance, count)
 */
declare global {
    interface Window {
        gtag?: (command: 'event', action: string, params: {
            event_category?: string;
            event_label?: string;
            value?: number;
            send_to?: string;
        }) => void;
    }
}

export const trackEvent = (action: string, category: string, label: string, value?: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
            send_to: GA_TRACKING_ID,
        });
    }
};
