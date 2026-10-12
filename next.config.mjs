/** @type {import('next').NextConfig} */
export default {output:'standalone',serverExternalPackages:['node:sqlite'],experimental:{proxyClientMaxBodySize:'12mb'},async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'SAMEORIGIN'}]}]}};
