import { createContext, useContext, useState, ReactNode } from "react";

export type Pandemic = {
  name: string;
  R0: number;
  incubation: number;
  infectious: number;
  cfr: number; // case fatality rate
  icuRate: number;
  hospRate: number;
  vector: string;
  vaccine: { doses: number; gapDays: number; efficacy: number };
  history: string;
};

export const PANDEMICS: Pandemic[] = [
  { name: "COVID-19", R0: 2.5, incubation: 5.1, infectious: 7, cfr: 0.02, icuRate: 0.05, hospRate: 0.18, vector: "Respiratory droplets", vaccine: { doses: 2, gapDays: 28, efficacy: 0.94 }, history: "Emerged Wuhan 2019. Controlled via lockdowns, masks, mRNA vaccines." },
  { name: "Influenza H1N1", R0: 1.5, incubation: 2, infectious: 5, cfr: 0.002, icuRate: 0.02, hospRate: 0.08, vector: "Respiratory droplets", vaccine: { doses: 1, gapDays: 0, efficacy: 0.6 }, history: "2009 pandemic. Controlled via annual vaccination and antivirals." },
  { name: "Influenza H5N1", R0: 1.8, incubation: 3, infectious: 6, cfr: 0.5, icuRate: 0.3, hospRate: 0.6, vector: "Avian to human", vaccine: { doses: 2, gapDays: 21, efficacy: 0.7 }, history: "Avian flu, highly fatal. Controlled via culling and antivirals." },
  { name: "SARS", R0: 3.0, incubation: 5, infectious: 10, cfr: 0.1, icuRate: 0.2, hospRate: 0.7, vector: "Respiratory droplets", vaccine: { doses: 0, gapDays: 0, efficacy: 0 }, history: "2003 outbreak. Controlled via quarantine, contact tracing, isolation." },
  { name: "MERS", R0: 0.9, incubation: 5, infectious: 14, cfr: 0.35, icuRate: 0.5, hospRate: 0.8, vector: "Camel to human", vaccine: { doses: 0, gapDays: 0, efficacy: 0 }, history: "2012 Saudi Arabia. Controlled via hospital infection control." },
  { name: "Ebola", R0: 1.8, incubation: 8, infectious: 10, cfr: 0.5, icuRate: 0.6, hospRate: 0.9, vector: "Bodily fluids", vaccine: { doses: 1, gapDays: 0, efficacy: 0.97 }, history: "West Africa 2014. Controlled via ring vaccination, safe burials, contact tracing." },
  { name: "Mpox", R0: 1.2, incubation: 7, infectious: 21, cfr: 0.03, icuRate: 0.01, hospRate: 0.1, vector: "Close contact, lesions", vaccine: { doses: 2, gapDays: 28, efficacy: 0.85 }, history: "2022 outbreak. Controlled via targeted vaccination of high-risk groups." },
  { name: "Zika", R0: 2.0, incubation: 6, infectious: 7, cfr: 0.001, icuRate: 0.005, hospRate: 0.02, vector: "Aedes mosquito", vaccine: { doses: 0, gapDays: 0, efficacy: 0 }, history: "2015 Brazil. Controlled via vector control, repellent, travel advisories." },
  { name: "Nipah", R0: 0.5, incubation: 10, infectious: 14, cfr: 0.7, icuRate: 0.7, hospRate: 0.95, vector: "Bat to human", vaccine: { doses: 0, gapDays: 0, efficacy: 0 }, history: "Recurrent in Kerala/Bangladesh. Controlled via strict isolation and PPE." },
  { name: "Dengue", R0: 4.0, incubation: 7, infectious: 5, cfr: 0.025, icuRate: 0.02, hospRate: 0.15, vector: "Aedes mosquito", vaccine: { doses: 3, gapDays: 180, efficacy: 0.6 }, history: "Endemic tropics. Controlled via vector control, fluid management." },
  { name: "Cholera", R0: 2.0, incubation: 2, infectious: 7, cfr: 0.01, icuRate: 0.02, hospRate: 0.2, vector: "Contaminated water", vaccine: { doses: 2, gapDays: 14, efficacy: 0.65 }, history: "Ongoing in Yemen, Haiti. Controlled via clean water, ORS, oral vaccine." },
  { name: "Measles", R0: 15, incubation: 10, infectious: 8, cfr: 0.002, icuRate: 0.01, hospRate: 0.2, vector: "Airborne", vaccine: { doses: 2, gapDays: 28, efficacy: 0.97 }, history: "Eliminated via MMR vaccine; resurgent where coverage drops." },
  { name: "Tuberculosis", R0: 1.5, incubation: 90, infectious: 365, cfr: 0.15, icuRate: 0.02, hospRate: 0.3, vector: "Airborne", vaccine: { doses: 1, gapDays: 0, efficacy: 0.5 }, history: "BCG vaccine, DOTS therapy, contact tracing." },
  { name: "Plague", R0: 2.5, incubation: 4, infectious: 7, cfr: 0.6, icuRate: 0.5, hospRate: 0.8, vector: "Fleas, rodents", vaccine: { doses: 0, gapDays: 0, efficacy: 0 }, history: "Historic. Controlled via antibiotics, rodent control, isolation." },
  { name: "Marburg", R0: 1.6, incubation: 7, infectious: 9, cfr: 0.5, icuRate: 0.6, hospRate: 0.9, vector: "Fruit bats", vaccine: { doses: 0, gapDays: 0, efficacy: 0 }, history: "Sporadic Africa. Controlled via isolation, contact tracing." },
];

type Ctx = { pandemic: Pandemic; setPandemicName: (n: string) => void; pandemics: Pandemic[] };
const C = createContext<Ctx>({ pandemic: PANDEMICS[0], setPandemicName: () => {}, pandemics: PANDEMICS });

export function EpidemicProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("COVID-19");
  const pandemic = PANDEMICS.find(p => p.name === name) ?? PANDEMICS[0];
  return <C.Provider value={{ pandemic, setPandemicName: setName, pandemics: PANDEMICS }}>{children}</C.Provider>;
}

export const useEpidemic = () => useContext(C);
