import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_BASE_URL||'http://localhost:4000/api/v1',withCredentials:true,headers:{'Content-Type':'application/json','X-App-Request':'restaurant-web'}});
api.interceptors.response.use(r=>r.data.data,async error=>{if(error.response?.status===401&&!error.config?._retried&&!String(error.config?.url).includes('/auth/')){try{await api.post('/auth/refresh');error.config._retried=true;return api(error.config)}catch{/* handled below */}}return Promise.reject(new Error(error.response?.data?.error?.message||'Something went wrong'))});
export const formatMoney=(value:number,currency='LKR')=>new Intl.NumberFormat('en-LK',{style:'currency',currency,minimumFractionDigits:2}).format(value/100);

