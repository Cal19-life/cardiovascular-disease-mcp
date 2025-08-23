/*
  Sex, Age, Race
*/
import { differenceInYears, parseISO } from "date-fns";

export function getPatientName(patient: any): string {
  const name = patient.name?.[0];
  if (!name) return "Unknown";
  const given = name.given?.join(" ") ?? "";
  const family = name.family ?? "";
  const fullName = `${given} ${family}`.trim();
  return fullName || "Unknown";
}

export function getPatientSex(patient: any): string {
  return patient.gender ?? "unknown";
}

export function getPatientAge(patient: any): number {
  if (!patient.birthDate) {
    throw new Error("Patient birthDate is missing");
  }

  const date = parseISO(patient.birthDate);
  const age = differenceInYears(new Date(), date);

  return age;
}

export function getPatientRace(patient: any): string[] {
  const raceExtension = patient.extension?.find(
    (ext: any) => ext.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"
  );

  const raceValues =
    raceExtension?.extension
      ?.filter((sub: any) => sub.url === "ombCategory")
      ?.map((sub: any) => sub.valueCoding?.display)
      ?.filter(Boolean) ?? []; // removes any undefined or null values from list

  return raceValues.length > 0 ? raceValues : ["Unknown"];
}
