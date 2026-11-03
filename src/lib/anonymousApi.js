import { getPlayerIdentity } from "@/lib/playerIdentity";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export function playerPayload(){const p=getPlayerIdentity();return {player_id:p.id,player_secret:p.player_secret,username:p.username};}
export async function callApi(name,payload={}){const response=await fetch(`${API_BASE}/api/${encodeURIComponent(name)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...playerPayload(),...payload})});const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(data.error||`Request failed (${response.status})`);e.response={data,status:response.status};throw e;}return data;}
export function registerPlayer(){return callApi("playerApi",{action:"register"});}
