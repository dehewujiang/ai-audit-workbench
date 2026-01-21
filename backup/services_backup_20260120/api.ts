import { Project, GlobalState, User } from '../types';

// Helper to get the auth token from localStorage
const getToken = () => localStorage.getItem('authToken');

// Generic fetch wrapper that adds auth headers and handles errors
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // In a real app, this prefix would come from an environment variable
    // For local dev, this assumes the backend runs on the same host and is proxied
    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response;
};

// Authentication APIs
export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    return response.json();
};

export const getMe = async (): Promise<User> => {
    const response = await apiFetch('/auth/me');
    return response.json();
};

// Data Persistence APIs
export const getBootstrapData = async (): Promise<{ projects: Project[], globalState: GlobalState, activeProjectId: string | null }> => {
    const response = await apiFetch('/workspace/bootstrap');
    return response.json();
};

export const saveProject = async (project: Project): Promise<Project> => {
    const response = await apiFetch(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify(project),
    });
    return response.json();
};

export const createProject = async (name: string): Promise<Project> => {
    const response = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
    return response.json();
};

export const deleteProject = async (projectId: string): Promise<{ success: boolean }> => {
    const response = await apiFetch(`/projects/${projectId}`, {
        method: 'DELETE',
    });
    return response.json();
};

export const setActiveProjectId = async (projectId: string | null): Promise<{ success: boolean }> => {
    const response = await apiFetch('/workspace/active-project', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
    });
    return response.json();
};

export const saveGlobalState = async (globalState: GlobalState): Promise<GlobalState> => {
    const response = await apiFetch('/workspace/global-state', {
        method: 'PUT',
        body: JSON.stringify(globalState),
    });
    return response.json();
};

// AI Proxy APIs (Streaming)
export async function* postStream(endpoint: string, body: any, signal?: AbortSignal): AsyncGenerator<any> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Failed to get response reader for streaming.');
    }

    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        const chunk = decoder.decode(value);
        // Assuming the backend sends JSON chunks separated by newlines
        const jsonChunks = chunk.split('\n').filter(c => c.trim());
        for (const jsonChunk of jsonChunks) {
            try {
                yield JSON.parse(jsonChunk);
            } catch (e) {
                // If it's not JSON, might be a simple text stream from a legacy endpoint
                yield { text: jsonChunk };
            }
        }
    }
}

// AI Proxy APIs (Unary/Non-streaming)
export const post = async (endpoint: string, body: any): Promise<any> => {
    const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return response.json();
};
