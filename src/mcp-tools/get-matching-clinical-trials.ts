import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { IMcpTool } from "../../IMcpTool";
import { createTextResponse } from "../../mcp-utilities";
import { fetchClinicalTrials } from "../utils/fetch-clinical-trials";
import { studiesListedInfo } from "../utils/studies-listed-info";
import { getFhirContext, getFhirResource, getPatientIdIfContextExists } from "../../fhir-utilities";
import axios from "axios";
import { getPatientAge, getPatientName, getPatientRace, getPatientSex } from "../utils/patient-demographics";

class GetMatchingClinicalTrials implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.tool(
      "get_matching_clinical_trials",
      "Retrieves clinical trials studies with search query parameters based on a patient's attributes.",
      {
        patientID: z
          .string()
          .describe("The ID of the patient to find clinical trials for"),
        condition: z
          .string()
          .describe("The clinical trial condition listed in the study"),
        location: z
          .string()
          .optional()
          .describe("The location of the clinical trial (optional)"),
      },
      async ({ patientID, condition, location }) => {
        const fhirContext = getFhirContext(req);
        if (!fhirContext) {
          console.log("no fhir context");
          return createTextResponse(
            "A FHIR server url or token was not provided in the HTTP context.",
            { isError: true }
          );
        }

        const patientIdContext = getPatientIdIfContextExists(req);
        const effectivePatientId = patientIdContext || patientID; // patientIdContext if exists, otherwise use patientID
        if (!effectivePatientId) {
          console.log("no patient ID");
          return createTextResponse(
            "No patient ID provided or found in context.",
            { isError: true }
          );
        }

        const headers = {
          Authorization: `Bearer ${fhirContext.token}`,
        };

        // FHIR Patient resource for retrieving patient demographics
        const { data: patientResource } = await axios.get(
          `${fhirContext.url}/Patient/${effectivePatientId}`,
          { headers }
        );

        // FHIR Observations for retrieving patient vitals and conditions
        const observations = await getFhirResource(
          fhirContext,
          "Observation",
          effectivePatientId
        )
          .then((res) => {
            if (!res.entry?.length) {
              return [];
            }
            return res.entry.map((x) => x.resource);
          })
          .catch((error) => {
            console.error("Error fetching observations:", error);
            return [];
          });

        const conditionsRes = await getFhirResource(
          fhirContext,
          "Condition",
          effectivePatientId
        )
          .then((res) => {
            if (!res.entry?.length) {
              return [];
            }
            return res.entry.map((x) => x.resource);
          })
          .catch((error) => {
            console.error("Error fetching conditions:", error);
            return [];
          });
        const name = getPatientName(patientResource);
        const age = getPatientAge(patientResource);
        const gender = getPatientSex(patientResource).toUpperCase();
        const race = getPatientRace(patientResource).join(", ");
        
        try {
          // API call to ClinicalTrials.gov API (query params: https://clinicaltrials.gov/data-api/api)

          const args = {
            "query.cond": condition,
            "query.locn": location,
            "filter.overallStatus": "RECRUITING",
            // TODO: Add filters based on patient attributes
            "query.term": `
                AREA[SEX]${gender} AND
                AREA[MinimumAge]RANGE[MIN, ${age}] AND
                AREA[MaximumAge]RANGE[${age}, MAX]
            `,
          }
          const studies = await fetchClinicalTrials(args);
          const formattedStudies = studiesListedInfo(studies.slice(0,5));
          return createTextResponse("Clinical trials: \n" + formattedStudies);
        } catch (error) {
          console.error("Unexpected error:", error);
          return createTextResponse(
            "An error occurred while retrieving clinical trials." + error,
            { isError: true }
          );
        }
      }
    );
  }
}

export const GetMatchingClinicalTrialsInstance = new GetMatchingClinicalTrials();
