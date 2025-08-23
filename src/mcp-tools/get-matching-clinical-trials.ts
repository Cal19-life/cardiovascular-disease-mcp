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
        location: z
          .string()
          .optional()
          .describe("The location of the clinical trial (optional)"),
      },
      async ({ patientID, location }) => {
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
        const conditionArray: string[] = conditionsRes
          .map((x) => x.code?.coding?.map((y) => y.display) || [])
          .reduce((a, b) => a.concat(b), []);
        
        try {
          const filters: string[] = [];

          let conditionFilter = "";
          if (conditionArray.length > 0) {
            const joinedConditions = conditionArray
              .map((c) => `AREA[Condition] "${c}"`)
              .join(" OR ");
            conditionFilter = `(${joinedConditions})`; // wrap in parentheses
          }
          if (conditionFilter) {
            filters.push(conditionFilter);
          }
          if (location) {
            filters.push(`AREA[LocationCountry] "${location}"`);
          }
          if (age) {
            filters.push(`AREA[MinimumAge] RANGE[MIN,${age} years]`);
            filters.push(`AREA[MaximumAge] RANGE[${age} years,MAX]`);
          }

          filters.push(`AREA[OverallStatus] RECRUITING`);
          const args = {
            "query.term": filters.join(" AND "),
          };
          console.log("args: ", args);
          const studies = await fetchClinicalTrials(args);
          console.log(studies);
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
