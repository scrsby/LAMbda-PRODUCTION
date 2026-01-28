/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: API Send Utility
 File: api.ts
 Description: Handles interaction with the backend with Axios
 Last Edited: 26 January 2026
*/

import axios from 'axios'; 
const SERVER_LOCATION: String = "localhost:5432"

export async function apiAxios(endpoint: string, options: any = {}) {
    const url = `http://${SERVER_LOCATION}${endpoint}`;

    try {
        const response = await axios({
            url,
            data: options.body,              
            withCredentials: true,           
            ...options
        });

        // Axios automatically parses JSON, so we just return response.data
        return response.data;

    } catch (err: any) {
        // Axios throws automatically for non-2xx status codes
        if (err.response) {
            // Server responded with a status outside 2xx
            console.error('API error:', err.response.data);
            throw new Error(err.response.data || `HTTP ${err.response.status}`);
        } else if (err.request) {
            // Request was made but no response was received
            console.error('Network error:', err.request);
            throw new Error('Network error: No response from server');
        } else {
            console.error('Config error:', err.message);
            throw err;
        }
    }
}