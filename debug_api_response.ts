
import { api } from './src/lib/utils';
import dotenv from 'dotenv';

dotenv.config();

// Mock axios if needed or just use the one from utils if it works in node
// actually utils.ts uses axios, but might rely on browser env vars?
// Let's just use axios directly to be sure.
import axios from 'axios';

async function checkApi() {
    const baseURL = 'http://localhost:3001'; // Assuming backend is on 3001
    const clinicCode = 'vieiralves';

    // First get insurances to find Bradesco ID
    console.log('Fetching insurances...');
    const insRes = await axios.get(`${baseURL}/api/appointments/insurances`);
    const insurances = insRes.data;
    const bradesco = insurances.find((i: any) => i.name.toLowerCase().includes('bradesco') || i.id.toLowerCase().includes('bradesco'));

    if (!bradesco) {
        console.log('Bradesco not found');
        return;
    }
    console.log('Found Bradesco:', bradesco.id, bradesco.name);

    // Now fetch procedures
    console.log(`Fetching procedures for clinic ${clinicCode} and insurance ${bradesco.id}...`);
    const url = `${baseURL}/api/clinic/clinics/${clinicCode}/insurances/${bradesco.id}/procedures`;
    try {
        const res = await axios.get(url);
        console.log('Response status:', res.status);
        console.log('Response data:', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.error('Error fetching procedures:', e.message);
        if (e.response) {
            console.error('Data:', e.response.data);
        }
    }
}

checkApi();
