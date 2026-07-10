"use client";
import { FormEvent, useState } from "react";

export function InquiryForm({ product = "EDJ Fire Pump Set" }: { product?: string }) {
  const [state, setState] = useState<{ loading: boolean; message: string }>({ loading: false, message: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState({ loading: true, message: "" });
    const form = event.currentTarget; const fields = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, consent: (fields.consent === "on") }) });
    const data = await response.json() as { error?: string; message?: string };
    if (response.ok) { form.reset(); setState({ loading: false, message: data.message ?? "Thank you. Your enquiry is recorded." }); }
    else setState({ loading: false, message: data.error ?? "We could not submit your enquiry. Please email us directly." });
  }
  return <form className="inquiry-form" onSubmit={submit}><input className="honeypot" name="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <div className="form-grid"><label>Full name<input name="name" required autoComplete="name" /></label><label>Company<input name="company" required autoComplete="organization" /></label><label>Email<input type="email" name="email" required autoComplete="email" /></label><label>Phone / WhatsApp<input name="phone" autoComplete="tel" /></label><label>Country<select name="country" required defaultValue=""><option value="" disabled>Select country</option><option>Algeria</option><option>Egypt</option><option>Ghana</option><option>Kenya</option><option>Morocco</option><option>Nigeria</option><option>South Africa</option><option>Tanzania</option><option>Other African market</option></select></label><label>Product interest<select name="productInterest" defaultValue={product}>{["EDJ Fire Pump Set", "Diesel Engine + Jockey Pump Set", "Electric Long-Shaft Fire Pump", "Frequency Conversion Water Supply Equipment", "Diesel Engine Pump Trailer", "Not sure yet"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <label>Project requirement<textarea name="message" required minLength={20} placeholder="Application, flow, head / pressure, power availability and project timing" /></label><label className="consent"><input type="checkbox" name="consent" required />I agree that GRIMM PUMP may use these details to respond to this request.</label><button className="cta" disabled={state.loading}>{state.loading ? "Sending…" : "Send project enquiry →"}</button><p className="form-message" aria-live="polite">{state.message}</p>
  </form>;
}
