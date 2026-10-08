// client/src/services/api.js — v3 (adds analytics, scheduled, bulk, hrmis, search)
import axios from "axios";

const api = axios.create({ baseURL: "/api", headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false, failedQueue = [];
const processQueue = (err, token=null) => { failedQueue.forEach(p=>err?p.reject(err):p.resolve(token)); failedQueue=[]; };

api.interceptors.response.use(res=>res, async (error) => {
  const orig = error.config;
  if (error.response?.status===401 && error.response?.data?.code==="TOKEN_EXPIRED" && !orig._retry) {
    if (isRefreshing) return new Promise((res,rej)=>failedQueue.push({resolve:res,reject:rej})).then(t=>{orig.headers.Authorization=`Bearer ${t}`;return api(orig);});
    orig._retry=true; isRefreshing=true;
    try {
      const rToken=localStorage.getItem("refreshToken");
      if(!rToken) throw new Error("No refresh token");
      const {data}=await axios.post("/api/auth/refresh",{refreshToken:rToken});
      localStorage.setItem("accessToken",data.accessToken); localStorage.setItem("refreshToken",data.refreshToken);
      processQueue(null,data.accessToken); orig.headers.Authorization=`Bearer ${data.accessToken}`; return api(orig);
    } catch(err){ processQueue(err,null); localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); window.location.href="/login"; return Promise.reject(err); }
    finally { isRefreshing=false; }
  }
  return Promise.reject(error);
});

export const authAPI = {
  register:(data)=>api.post("/auth/register",data), login:(data)=>api.post("/auth/login",data),
  logout:()=>api.post("/auth/logout"), me:()=>api.get("/auth/me"), changePassword:(data)=>api.post("/auth/change-password",data),
};
export const usersAPI = {
  directory:(p)=>api.get("/users/directory",{params:p}), getUser:(id)=>api.get(`/users/${id}`),
  updateProfile:(d)=>api.patch("/users/me/profile",d), myChannels:()=>api.get("/users/me/channels"),
  setupOptions:()=>api.get("/users/setup/options"),
};
export const channelsAPI = {
  list:()=>api.get("/channels"), listAll:()=>api.get("/channels/all"), get:(id)=>api.get(`/channels/${id}`),
  create:(d)=>api.post("/channels",d), members:(id)=>api.get(`/channels/${id}/members`),
  requestJoin:(id,r)=>api.post(`/channels/${id}/join-request`,{reason:r}),
  reviewRequest:(cId,rId,action,note)=>api.patch(`/channels/${cId}/join-request/${rId}`,{action,note}),
  archive:(id)=>api.delete(`/channels/${id}`),
  pinned:(id)=>api.get(`/messages/${id}/pinned`),
};
export const messagesAPI = {
  list:(cId,p)=>api.get(`/messages/${cId}`,{params:p}), send:(cId,d)=>api.post(`/messages/${cId}`,d),
  edit:(id,c)=>api.patch(`/messages/${id}`,{content:c}), delete:(id)=>api.delete(`/messages/${id}`),
  pin:(id)=>api.post(`/messages/${id}/pin`), react:(id,e)=>api.post(`/messages/${id}/react`,{emoji:e}),
};
export const pollsAPI = {
  create:(d)=>api.post("/polls",d), vote:(pId,oId)=>api.post(`/polls/${pId}/vote`,{optionId:oId}),
  close:(pId)=>api.patch(`/polls/${pId}/close`),
};
export const dmsAPI = {
  conversations:()=>api.get("/dms/conversations"), messages:(uId,p)=>api.get(`/dms/${uId}`,{params:p}),
  send:(uId,c)=>api.post(`/dms/${uId}`,{content:c}),
};
export const adminAPI = {
  stats:()=>api.get("/admin/stats"), users:(p)=>api.get("/admin/users",{params:p}),
  updateUser:(id,d)=>api.patch(`/admin/users/${id}`,d), joinRequests:(s)=>api.get("/admin/join-requests",{params:{status:s}}),
  auditLog:(p)=>api.get("/admin/audit-log",{params:p}), emergencyBroadcast:(c)=>api.post("/admin/emergency-broadcast",{content:c}),
  setupData:()=>api.get("/admin/setup-data"),
};
export const uploadsAPI = {
  toChannel:(cId,fd,onP)=>api.post(`/uploads/message/${cId}`,fd,{headers:{"Content-Type":"multipart/form-data"},onUploadProgress:onP}),
  deleteAttachment:(id)=>api.delete(`/uploads/${id}`),
};
export const notificationsAPI = {
  vapidKey:()=>api.get("/notifications/vapid-public-key"), subscribe:(d)=>api.post("/notifications/subscribe",d),
  unsubscribe:(e)=>api.delete("/notifications/unsubscribe",{data:{endpoint:e}}),
  list:(p)=>api.get("/notifications",{params:p}), markRead:(id)=>api.patch(`/notifications/${id}/read`),
  markAllRead:()=>api.patch("/notifications/read-all"),
};

// ── Phase 3 ───────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  overview:()=>api.get("/analytics/overview"),
  messageVolume:(days=30)=>api.get(`/analytics/message-volume?days=${days}`),
  stateEngagement:()=>api.get("/analytics/state-engagement"),
  deptEngagement:()=>api.get("/analytics/department-engagement"),
  topChannels:(n=10)=>api.get(`/analytics/top-channels?limit=${n}`),
  activeStaff:(n=10)=>api.get(`/analytics/active-staff?limit=${n}`),
  recentActivity:()=>api.get("/analytics/recent-activity"),
  pollParticipation:()=>api.get("/analytics/poll-participation"),
};
export const scheduledAPI = {
  list:(status="PENDING")=>api.get(`/scheduled?status=${status}`),
  create:(d)=>api.post("/scheduled",d),
  cancel:(id)=>api.delete(`/scheduled/${id}`),
};
export const bulkAPI = {
  list:()=>api.get("/bulk"),
  create:(d)=>api.post("/bulk",d),
  get:(id)=>api.get(`/bulk/${id}`),
};
export const hrmisAPI = {
  template:()=>api.get("/hrmis/template",{responseType:"blob"}),
  imports:()=>api.get("/hrmis/imports"),
  preview:(fd)=>api.post("/hrmis/preview",fd,{headers:{"Content-Type":"multipart/form-data"}}),
  import:(fd)=>api.post("/hrmis/import",fd,{headers:{"Content-Type":"multipart/form-data"}}),
};
export const searchAPI = {
  messages:(q,limit)=>api.get(`/search?q=${encodeURIComponent(q)}&type=messages&limit=${limit||20}`),
  channels:(q)=>api.get(`/search?q=${encodeURIComponent(q)}&type=channels`),
  staff:(q)=>api.get(`/search?q=${encodeURIComponent(q)}&type=staff`),
};

export default api;
