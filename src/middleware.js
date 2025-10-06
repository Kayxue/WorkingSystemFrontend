// src/middleware.js
import { defineMiddleware, sequence } from 'astro:middleware';
import { BACKEND_BASE_URL } from './Constant';

const checkAuth = defineMiddleware(async (context, next) => {
    if (context.url.pathname.startsWith('/api/')) {
        return next();
    }
    const userCookies = context.request.headers.get('cookie') || '';
    let loginData = { loggedIn: false, user: null}; 

    try {
        const response = await fetch(`${BACKEND_BASE_URL}/user/profile`, {
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            "Cookie": userCookies,
            },
            credentials: "include",
        });
        
        if (response.ok) {
            const data = await response.json();
            loginData.user = data;
            loginData.loggedIn = true;
        } else {
            loginData.loggedIn = false;
            loginData.user = null;
            console.warn('Failed to fetch login status from backend:', response.statusText);
            console.warn('Backend login check failed with status:', response.status);
        }
    } catch (error) {
        console.error('Error checking login status in middleware:', error);
    }

    context.locals.authData = loginData;

    const protectedRoutes = ['/edit-job', '/post-job', '/dashboard', '/calendar','/profile','/account-settings']
    const adminRoutes = ['/admin/admin-dashboard','/admin/user-approval','/admin/jobs'];
    if (loginData.user?.role !== 'admin' && adminRoutes.includes(context.url.pathname)) {
        return new Response(null, { status: 404 }); 
    }
    // admin try to access employer route
    if (loginData.user?.role == 'admin' && !adminRoutes.includes(context.url.pathname)) {
        return Response.redirect(new URL('/admin/admin-dashboard', context.url));
    }
    if (!loginData.loggedIn && protectedRoutes.includes(context.url.pathname)) {
        return Response.redirect(new URL('/redirect-login', context.url));
    }
    return next();
});

export const onRequest = sequence(checkAuth);