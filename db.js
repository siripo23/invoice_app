// IndexedDB with Customer Database and Payment Tracking
class InvoiceDB {
    constructor() {
        this.dbName = 'InvoiceDB';
        this.version = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('invoices')) {
                    const objectStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
                    objectStore.createIndex('invoiceNo', 'invoiceNo', { unique: true });
                    objectStore.createIndex('date', 'date', { unique: false });
                    objectStore.createIndex('paymentStatus', 'paymentStatus', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('customers')) {
                    const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                    customerStore.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }

    encrypt(data) {
        return btoa(JSON.stringify(data));
    }

    decrypt(data) {
        return JSON.parse(atob(data));
    }

    async saveInvoice(invoice) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['invoices'], 'readwrite');
            const objectStore = transaction.objectStore('invoices');
            
            const encryptedInvoice = {
                ...invoice,
                paymentStatus: invoice.paymentStatus || 'unpaid',
                encryptedData: this.encrypt(invoice)
            };
            
            const request = objectStore.add(encryptedInvoice);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllInvoices() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['invoices'], 'readonly');
            const objectStore = transaction.objectStore('invoices');
            const request = objectStore.getAll();
            
            request.onsuccess = () => {
                const invoices = request.result.map(inv => this.decrypt(inv.encryptedData));
                resolve(invoices);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async searchInvoices(searchTerm) {
        const allInvoices = await this.getAllInvoices();
        const term = searchTerm.toLowerCase();
        
        return allInvoices.filter(invoice => 
            invoice.invoiceNo.toLowerCase().includes(term) ||
            invoice.customerAddress.toLowerCase().includes(term) ||
            invoice.date.includes(term)
        );
    }

    async getLastInvoiceNumber() {
        const allInvoices = await this.getAllInvoices();
        if (allInvoices.length === 0) return 'SE-0001';
        
        const lastInvoice = allInvoices[allInvoices.length - 1];
        const parts = lastInvoice.invoiceNo ? lastInvoice.invoiceNo.split('-') : [];
        const lastNumber = parts.length > 1 ? parseInt(parts[parts.length - 1]) : 0;
        const nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
        return `SE-${String(nextNumber).padStart(4, '0')}`;
    }

    async updateInvoice(id, invoice) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['invoices'], 'readwrite');
            const objectStore = transaction.objectStore('invoices');
            
            const encryptedInvoice = {
                ...invoice,
                id: id,
                encryptedData: this.encrypt(invoice)
            };
            
            const request = objectStore.put(encryptedInvoice);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Customer Database
    async saveCustomer(customer) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const objectStore = transaction.objectStore('customers');
            const request = objectStore.add(customer);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllCustomers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readonly');
            const objectStore = transaction.objectStore('customers');
            const request = objectStore.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCustomer(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const objectStore = transaction.objectStore('customers');
            const request = objectStore.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

const invoiceDB = new InvoiceDB();
invoiceDB.init().then(() => {
    console.log('Database initialized successfully');
    window.dispatchEvent(new Event('dbInitialized'));
}).catch(err => {
    console.error('Database init failed, trying to reset DB:', err);
    // If version conflict or upgrade error, delete and recreate
    var deleteReq = indexedDB.deleteDatabase('InvoiceDB');
    deleteReq.onsuccess = function() {
        console.log('Old DB deleted, reinitializing...');
        invoiceDB.init().then(() => {
            console.log('Database reinitialized successfully');
            window.dispatchEvent(new Event('dbInitialized'));
        }).catch(err2 => {
            console.error('Database reinitialization also failed:', err2);
            window.dispatchEvent(new Event('dbInitialized'));
        });
    };
    deleteReq.onerror = function() {
        console.error('Could not delete old DB');
        window.dispatchEvent(new Event('dbInitialized'));
    };
});
