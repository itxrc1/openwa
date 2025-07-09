const axios = require('axios');

const ALADHAN_API_URL = 'http://api.aladhan.com/v1/timingsByCity';
const API_METHOD = 2; // Default calculation method (ISNA)

// Default city and country
const DEFAULT_CITY = 'Karachi';
const DEFAULT_COUNTRY = 'Pakistan';

// Function to convert 24-hour time to 12-hour time format
function convertTo12HourFormat(time) {
    const [hour, minute] = time.split(':').map(Number);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12
    return `${hour12}:${minute < 10 ? '0' : ''}${minute} ${suffix}`;
}

// Function to get Namaz timings
async function getNamazTimings(city, country) {
    try {
        const response = await axios.get(`${ALADHAN_API_URL}`, {
            params: {
                city: city,
                country: country,
                method: API_METHOD,
            },
        });
        const data = response.data;
        if (data.code !== 200) {
            throw new Error(data.status);
        }
        return data.data.timings;
    } catch (error) {
        console.error('Error fetching Namaz timings:', error);
        throw new Error('Failed to fetch Namaz timings. Please try again.');
    }
}

module.exports = {
    admin: false,
    name: 'prayer',
    alias: ['namaz', 'salah'],
    category: 'info',
    run: async (m) => {
        // Extract city and country from the message text, or use default values
        const [city, country] = m.text.trim().split(',').map(str => str.trim());
        const targetCity = city || DEFAULT_CITY;
        const targetCountry = country || DEFAULT_COUNTRY;

        try {
            const timings = await getNamazTimings(targetCity, targetCountry);
            const responseText = `
*Namaz Timings for ${targetCity}, ${targetCountry}*

*Fajr:* ${convertTo12HourFormat(timings.Fajr)}
*Dhuhr:* ${convertTo12HourFormat(timings.Dhuhr)}
*Asr:* ${convertTo12HourFormat(timings.Asr)}
*Maghrib:* ${convertTo12HourFormat(timings.Maghrib)}
*Isha:* ${convertTo12HourFormat(timings.Isha)}
            `;
            await m.reply(responseText);
        } catch (error) {
            m.reply(error.message);
        }
    },
};
