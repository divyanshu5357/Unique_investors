// Sample data script for testing dashboard
// This script adds sample sales and commission data to Firestore
// Run this manually in the browser console or Firebase admin

const samplePlots = [
    {
        id: 'plot-1',
        projectName: 'Green Valley Project',
        type: 'Residential',
        block: 'A',
        plotNumber: 101,
        status: 'sold',
        dimension: '40x60',
        area: 2400,
        buyerName: 'Rajesh Kumar',
        salePrice: 1500000,
        soldAmount: 1500000,
        commissionRate: 2,
        brokerId: 'broker-1',
        brokerName: 'Amit Sharma',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'plot-2',
        projectName: 'City Heights',
        type: 'Commercial',
        block: 'B',
        plotNumber: 205,
        status: 'sold',
        dimension: '50x80',
        area: 4000,
        buyerName: 'Priya Singh',
        salePrice: 2500000,
        soldAmount: 2500000,
        commissionRate: 1.5,
        brokerId: 'broker-2',
        brokerName: 'Neha Gupta',
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-02-20'),
    },
    {
        id: 'plot-3',
        projectName: 'Garden View',
        type: 'Villa',
        block: 'C',
        plotNumber: 305,
        status: 'sold',
        dimension: '60x100',
        area: 6000,
        buyerName: 'Suresh Patel',
        salePrice: 3500000,
        soldAmount: 3500000,
        commissionRate: 2.5,
        brokerId: 'broker-1',
        brokerName: 'Amit Sharma',
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10'),
    },
    {
        id: 'plot-4',
        projectName: 'Tech Park Phase 2',
        type: 'Commercial',
        block: 'D',
        plotNumber: 410,
        status: 'sold',
        dimension: '80x120',
        area: 9600,
        buyerName: 'Kavya Reddy',
        salePrice: 5000000,
        soldAmount: 5000000,
        commissionRate: 2,
        brokerId: 'broker-3',
        brokerName: 'Ravi Kumar',
        createdAt: new Date('2024-10-05'),
        updatedAt: new Date('2024-10-05'),
    }
];

const sampleCommissions = [
    {
        id: 'comm-1',
        saleId: 'plot-1',
        sellerId: 'broker-1',
        sellerName: 'Amit Sharma',
        receiverId: 'broker-1',
        receiverName: 'Amit Sharma',
        level: 1,
        amount: 30000,
        percentage: 2,
        saleAmount: 1500000,
        createdAt: new Date('2024-01-15'),
        plotId: 'plot-1',
        projectName: 'Green Valley Project',
    },
    {
        id: 'comm-2',
        saleId: 'plot-2',
        sellerId: 'broker-2',
        sellerName: 'Neha Gupta',
        receiverId: 'broker-2',
        receiverName: 'Neha Gupta',
        level: 1,
        amount: 37500,
        percentage: 1.5,
        saleAmount: 2500000,
        createdAt: new Date('2024-02-20'),
        plotId: 'plot-2',
        projectName: 'City Heights',
    },
    {
        id: 'comm-3',
        saleId: 'plot-3',
        sellerId: 'broker-1',
        sellerName: 'Amit Sharma',
        receiverId: 'broker-1',
        receiverName: 'Amit Sharma',
        level: 1,
        amount: 87500,
        percentage: 2.5,
        saleAmount: 3500000,
        createdAt: new Date('2024-03-10'),
        plotId: 'plot-3',
        projectName: 'Garden View',
    },
    {
        id: 'comm-4',
        saleId: 'plot-4',
        sellerId: 'broker-3',
        sellerName: 'Ravi Kumar',
        receiverId: 'broker-3',
        receiverName: 'Ravi Kumar',
        level: 1,
        amount: 100000,
        percentage: 2,
        saleAmount: 5000000,
        createdAt: new Date('2024-10-05'),
        plotId: 'plot-4',
        projectName: 'Tech Park Phase 2',
    }
];

console.log('Sample plots data:', JSON.stringify(samplePlots, null, 2));
console.log('Sample commissions data:', JSON.stringify(sampleCommissions, null, 2));

// To add this data to Firestore, you can:
// 1. Use Firebase Admin SDK in a Node.js script
// 2. Use Firebase web SDK in browser console
// 3. Use Firebase CLI with data import
// 4. Manually add through Firebase Console

// Example for Firebase web SDK (run in browser console after importing Firebase):
/*
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase-config';

async function addSampleData() {
    try {
        // Add plots
        for (const plot of samplePlots) {
            await addDoc(collection(db, 'plots'), plot);
            console.log('Added plot:', plot.id);
        }
        
        // Add commissions
        for (const commission of sampleCommissions) {
            await addDoc(collection(db, 'commissions'), commission);
            console.log('Added commission:', commission.id);
        }
        
        console.log('Sample data added successfully!');
    } catch (error) {
        console.error('Error adding sample data:', error);
    }
}

addSampleData();
*/