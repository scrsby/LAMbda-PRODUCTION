/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Register POS Transaction
 File: register.ts
 Description: Handles all client-side logic for registering a POS transaction, including form handling and API communication.
 Last Edited: 29 May 2026
*/

import { apiAxios } from '../utilities/api.js';
let ticket_items = [];
let unsynced_items = [];

/// BUTTON HANDLERS
const createTicketBtn = document.getElementById('create-ticket-btn');
createTicketBtn?.addEventListener('click', async () => {
    const ticketId = await createTicket();
    if (ticketId) {
        // Store the ticket ID for later use when adding items
        localStorage.setItem('currentTicketId', ticketId);
        alert(`Ticket created with ID: ${ticketId}`);
    }
});

/*  CREATE TICKET
*/
async function createTicket() {
    try {
        const response = await apiAxios('/POS/create-ticket', { method: 'POST' });
        const { ticketId } = response;
        console.log('Created ticket with ID:', ticketId);
        return ticketId;
    } catch (error) {
        console.error('Error creating ticket:', error);
        alert('Failed to create ticket. Please try again.');
    }
}