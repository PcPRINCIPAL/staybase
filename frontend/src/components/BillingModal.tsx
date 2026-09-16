import { useState } from "react";
import type { VatStatus } from "@shared/types";
import { saveBilling } from "../lib/api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { useToast } from "./Toast";
import { Icon } from "./Icon";

/**
 * §9a-popup: de facturatiegegevens van de eigenaar. Het btw-statuut bepaalt
 * of de gastfactuur 12% btw draagt of btw-vrij is; naam/adres/btw-nummer
 * vullen de factuurkoppen. Verschijnt vanzelf zolang het statuut op
 * "onbekend" staat (wegklikbaar), en is altijd te openen via de banner.
 */
export function BillingModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const t = useT();
  const toast = useToast();
  const b = user?.billing;
  const [vatStatus, setVatStatus] = useState<VatStatus>(b?.vatStatus === "onbekend" ? "particulier" : b?.vatStatus ?? "particulier");
  const [companyName, setCompanyName] = useState(b?.companyName ?? "");
  const [billingAddress, setBillingAddress] = useState(b?.billingAddress ?? "");
  const [vatNumber, setVatNumber] = useState(b?.vatNumber ?? "");
  const [vatPeriodic, setVatPeriodic] = useState(b?.vatPeriodic ?? true);
  const [busy, setBusy] = useState(false);

  const isCompany = vatStatus !== "particulier";

  const save = async () => {
    setBusy(true);
    try {
      const fresh = await saveBilling({ vatStatus, companyName, billingAddress, vatNumber, vatPeriodic });
      setUser(fresh);
      toast(t("bill.saved"));
      onClose();
    } catch {
      toast(t("bill.failed"));
    } finally {
      setBusy(false);
    }
  };

  const STATUSES: { id: VatStatus; label: string; sub: string; em: string }[] = [
    { id: "particulier", label: t("bill.particulier"), sub: t("bill.particulierSub"), em: "🙋" },
    { id: "vennootschap_btw", label: t("bill.vennBtw"), sub: t("bill.vennBtwSub"), em: "🏢" },
    { id: "vennootschap_geen_btw", label: t("bill.vennGeenBtw"), sub: t("bill.vennGeenBtwSub"), em: "🏛️" },
  ];

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card billing-modal" role="dialog" aria-label={t("bill.title")}>
        <div className="billing-head">
          <h2>{t("bill.title")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}><Icon name="x" /></button>
        </div>
        <p className="sub" style={{ marginTop: 2 }}>{t("bill.sub")}</p>

        <label className="billing-lbl">{t("bill.status")}</label>
        <div className="billing-choices">
          {STATUSES.map((s) => (
            <button key={s.id} className={`billing-choice ${vatStatus === s.id ? "sel" : ""}`}
              onClick={() => setVatStatus(s.id)}>
              <span className="em">{s.em}</span>
              <b>{s.label}</b>
              <span>{s.sub}</span>
            </button>
          ))}
        </div>

        {isCompany && (
          <div className="fld">
            <label htmlFor="bill-company">{t("bill.companyName")}</label>
            <input id="bill-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
        )}
        <div className="fld">
          <label htmlFor="bill-address">{t("bill.address")}</label>
          <input id="bill-address" type="text" placeholder={t("bill.addressPh")} value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)} />
        </div>
        {isCompany && (
          <>
            <div className="fld">
              <label htmlFor="bill-vat">{t("bill.vatNumber")}</label>
              <input id="bill-vat" type="text" placeholder={t("bill.vatNumberPh")} value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)} />
            </div>
            <label className="billing-check">
              <input type="checkbox" checked={vatPeriodic} onChange={(e) => setVatPeriodic(e.target.checked)} />
              <span>
                <b>{t("bill.periodic")}</b>
                <small>{t("bill.periodicHint")}</small>
              </span>
            </label>
          </>
        )}

        <div className="billing-actions">
          <button className="btn ghost" onClick={onClose}>{t("bill.later")}</button>
          <button className="btn coral" disabled={busy} onClick={save}>
            {busy ? t("bill.saving") : t("bill.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
