import PocketBase from 'pocketbase';

export async function validateUserToken(token) {
    const pb = new PocketBase(process.env.PUBLIC_POCKETBASE_URL);
    
    try {
        pb.authStore.save(token);
        const user = await pb.collection('users').authRefresh();
        return {
            valid: true,
            user: user.record
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}