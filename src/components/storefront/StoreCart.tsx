"use client";
import { useEffect, useState } from "react";
type CartItem={productId:string;name:string;price:number;image:string|null;quantity:number};
export function cartKey(slug:string){return `ecom-flash-cart:${slug}`;}
export function readCart(slug:string):CartItem[]{try{return JSON.parse(localStorage.getItem(cartKey(slug))||"[]") as CartItem[];}catch{return [];}}
export function writeCart(slug:string,items:CartItem[]){localStorage.setItem(cartKey(slug),JSON.stringify(items));window.dispatchEvent(new Event("ecom-cart-change"));}
export default function StoreCartButton({storeSlug,product}:{storeSlug:string;product:Omit<CartItem,"quantity">}){
 const [added,setAdded]=useState(false);
 function add(){const items=readCart(storeSlug);const existing=items.find(x=>x.productId===product.productId);if(existing)existing.quantity=Math.min(100,existing.quantity+1);else items.push({...product,quantity:1});writeCart(storeSlug,items);setAdded(true);window.setTimeout(()=>setAdded(false),1600);}
 return <button className="store-add-cart" onClick={add}>{added?"Added to cart":"Add to cart"}</button>;
}
export function StoreCartCount({storeSlug}:{storeSlug:string}){
 const [count,setCount]=useState(0);
 useEffect(()=>{const update=()=>setCount(readCart(storeSlug).reduce((s,i)=>s+i.quantity,0));update();window.addEventListener("ecom-cart-change",update);return()=>window.removeEventListener("ecom-cart-change",update);},[storeSlug]);
 return <a href={`/store/${storeSlug}/cart`} className="store-cart-link">Cart ({count})</a>;
}
