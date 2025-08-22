import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { IMcpTool } from "../../IMcpTool";
import { createTextResponse } from "../../mcp-utilities";
import { fetchClinicalTrials } from "../utils/fetch-clinical-trials";
import { studiesListedInfo } from "../utils/studies-listed-info";
import {
  getFhirContext,
  getFhirResource,
  getPatientIdIfContextExists,
} from "../../fhir-utilities";
import axios from "axios";
import {
  getPatientAge,
  getPatientName,
  getPatientRace,
  getPatientSex,
} from "../utils/patient-demographics";

class GetMatchingClinicalTrials implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.tool(
      "get_matching_clinical_trials",
      "Retrieves clinical trials that match a patient's demographics and conditions.",
      {
        patientID: z
          .string()
          .describe("The ID of the patient to find clinical trials for"),
        condition: z
          .string()
          .optional()
          .describe(
            "The clinical trial condition listed in the study (optional)"
          ),
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
        const name = getPatientName(patientResource);
        const age = getPatientAge(patientResource);
        const gender = getPatientSex(patientResource).toUpperCase();
        const race = getPatientRace(patientResource).join(", ");

        try {
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
          };
          const studies = await fetchClinicalTrials(args);
          const formattedStudies = studiesListedInfo(studies.slice(0, 3));
          return createTextResponse(
            `Clinical trials that ${name} fits the criteria for:\n ${formattedStudies}`
          );
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

export const GetMatchingClinicalTrialsInstance =
  new GetMatchingClinicalTrials();
