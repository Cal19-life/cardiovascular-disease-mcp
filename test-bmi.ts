import { getPatientObesityStatus } from "./utils/patient-conditions";

// Mock observation data from FHIR source
const mockObservations = [
  {
    code: {
      coding: [{ code: "8302-2" }] // Height (LOINC)
    },
    valueQuantity: {
      value: 170,
      unit: "cm"
    }
  },
  {
    code: {
      coding: [{ code: "29463-7" }] // Weight (LOINC)
    },
    valueQuantity: {
      value: 90,
      unit: "kg"
    }
  }
];

// Run function
const result = getPatientObesityStatus(mockObservations);

// Output
console.log("Is the patient obese?", result); // Expected output: true
