
'use server'

import { Plot, PlotSchema } from './schema';
import { db } from './firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';


export async function getPublicPlots(): Promise<Plot[]> {
    const snapshot = await getDocs(collection(db, "plots"));
    if (snapshot.empty) {
        return [];
    }
    function serializeTimestamps(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;
        const out: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            const value = obj[key];
            if (value && typeof value === 'object' && typeof value.toDate === 'function') {
                out[key] = value.toDate().toISOString();
            } else if (typeof value === 'object') {
                out[key] = serializeTimestamps(value);
            } else {
                out[key] = value;
            }
        }
        return out;
    }
    const plots = snapshot.docs.map(doc => {
        const data = serializeTimestamps(doc.data());
        const parseResult = PlotSchema.safeParse({ id: doc.id, ...data });
        if (parseResult.success) {
            return parseResult.data;
        }
        return null;
    }).filter((p): p is Plot => p !== null);
    return plots;
}

    