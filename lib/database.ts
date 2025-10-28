// lib/database.ts
const API_BASE_URL = 'https://kazumi-backend-production.up.railway.app/api'; // Railway deployment URL

export interface DatabaseResponse<T = any> {
    success?: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export class DatabaseService {
    private static async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<DatabaseResponse<T>> {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            const data = await response.json();

            if (!response.ok) {
                return { error: data.error || 'Request failed' };
            }

            return data;
        } catch (error) {
            console.error('Database request error:', error);
            return { error: 'Network error or server unavailable' };
        }
    }

    // Simpan data ke tabel tertentu
    static async saveData(table: string, data: any): Promise<DatabaseResponse> {
        return this.request(`/save-data`, {
            method: 'POST',
            body: JSON.stringify({ table, data }),
        });
    }

    // Ambil data dari tabel tertentu
    static async getData(table: string): Promise<DatabaseResponse> {
        return this.request(`/get-data/${table}`);
    }

    // Update data berdasarkan ID
    static async updateData(table: string, id: string | number, data: any): Promise<DatabaseResponse> {
        return this.request(`/update-data/${table}/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data }),
        });
    }

    // Hapus data berdasarkan ID
    static async deleteData(table: string, id: string | number): Promise<DatabaseResponse> {
        return this.request(`/delete-data/${table}/${id}`, {
            method: 'DELETE',
        });
    }

    // Method khusus untuk sinkronisasi state aplikasi
    static async syncAppState(state: any): Promise<DatabaseResponse> {
        return this.saveData('app_state', {
            state: JSON.stringify(state),
            timestamp: new Date().toISOString(),
        });
    }

    // Method khusus untuk mendapatkan state aplikasi terbaru
    static async getAppState(): Promise<DatabaseResponse> {
        const response = await this.getData('app_state');
        if (response.data && response.data.length > 0) {
            // Ambil state terbaru
            const latestState = response.data[0];
            return {
                success: true,
                data: JSON.parse(latestState.state),
            };
        }
        return { error: 'No state found' };
    }
}
