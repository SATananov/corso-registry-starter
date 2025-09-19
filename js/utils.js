export const qs = (s, r=document)=> r.querySelector(s);
export const qsa = (s, r=document)=> Array.from(r.querySelectorAll(s));
export function byId(id){ return document.getElementById(id); }
