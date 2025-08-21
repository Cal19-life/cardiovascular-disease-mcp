import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { IMcpTool } from "../../IMcpTool";
import { createTextResponse } from "../../mcp-utilities";
import { fetchClinicalTrials } from "../utils/fetch-clinical-trials";

import {  studiesListedEthicsSafetyEligibility } from "../utils/studies-listed-ethics-safety-eligibility-info";

// --- Assumptions ---
// 1. Eligibility, safety, and ethics can be *approximated* using certain fields
//    exposed by ClinicalTrials.gov API (see search areas).
// 2. IRB approval is not always explicitly provided in the API, but we assume 
//    the "OversightHasDMC" (Data Monitoring Committee) and "HasExpandedAccess" 
//    fields can approximate trial oversight and ethics indicators.
// 3. This script retrieves *ongoing recruiting studies* by default.


// ---------------------------------------------------------
// Class definition
// ---------------------------------------------------------

class GetEthicalClinicalTrials implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.tool(
      "get-trials-eligibility-ethics-safety",
      "Retrieves actively-recruiting clinical trials and returns information specifically "+
      "about their eligibility criteria, as well as metrics of safety and ethics."+
      "Can retrieve information on specific trials via a comma-separated string of NCTIds.",
      {
        condition: z
          .string()
          .describe("The clinical trial condition listed in the study"),
        location: z
          .string()
          .optional()
          .describe("The location of the clinical trial (optional)"),
        trialId: z
          .string() //TODO: fix so it can handle one or multiple IDs
          .optional()
          .describe("Specific NCT ID(s) of clinical trial(s) (optional)"),
      },
      async ({ condition, location, trialId }) => {
        try {
          // ---------------------------------------------------------
          // Step 1: Build query parameters (API search fields)
          // ---------------------------------------------------------
          const args: Record<string, string> = {};

          if (condition) {
            args["query.cond"] = condition; // filter by medical condition
          }
          if (location) {
            args["query.locn"] = location; // filter by location
          }
          if (trialId) {
            args["filter.ids"] = trialId; // directly filter by trial ID; TODO fix so it can handle one or multiple IDs
          }

          // Restrict to recruiting trials only
          args["filter.overallStatus"] = "RECRUITING";

          // General trial-information
          args["fields"] = 
          "BriefTitle,Location,OverallStatus,Condition,NCTId,LeadSponsorName,StartDate,PrimaryCompletionDate";
          //dot-notation fields: USE STUDY-STRUCTURE WEB-PAGE NAMES with reverse camel-case; Piece-Name; first string in title of field(and field group)
          // Eligibility criteria related fields
          args["fields"] +=
            ",EligibilityCriteria,Sex,GenderDescription,MinimumAge,MaximumAge,HealthyVolunteers";
          
          // Safety-related fields 
          args["fields"] +=
            ",Phase,DesignPrimaryPurpose,IsUnapprovedDevice";
          
          // Ethics-related fields (IRB/oversight proxies)
          args["fields"] +=
            ",OversightHasDMC,HasExpandedAccess,IsFDARegulatedDrug,IsFDARegulatedDevice";
          
          // ---------------------------------------------------------
          // Step 2: Fetch from ClinicalTrials.gov
          // ---------------------------------------------------------
          const studies = await fetchClinicalTrials(args);//TODO change so you can iterate through all pages of trials
          console.log("Number of studies fetched:", studies.length);//TODO REMOVE: DEBUG
          // ---------------------------------------------------------
          // Step 3: Format studies into readable text
          // ---------------------------------------------------------
          // Limits the number of studies reviewed by LLM to 100 to reduce computational load and time
          const formattedStudies = studiesListedEthicsSafetyEligibility(studies, 100);


          // --------------------------------------------------------- 
          // Step 4: Return as text response
          // ---------------------------------------------------------
          return createTextResponse("Filtered Clinical Trials (Eligibility, Safety, Ethics):\n" +
              formattedStudies+ 
              "\n Disclaimer: This tool receives only ongoing recruiting studies from ClinicalTrials.gov. "+
              "Proxy data-fields are used to approximate eligibility, safety, and ethics. "+
              "IRB approval is not always directly exposed by the API, and safety fields may not capture the full risk/benefit profile. "+
              "The ethics filtering relies on oversight-related fields"+
              "Not all fields necessary to make judgement on ethics and safety are available in the API response. "+
              "If you do not have the necessray information to make a judgement, indicate 'The requested studies do not have enough information to answer your query'"
              );               

        } catch (error) {
          console.error("Unexpected error:", error);
          return createTextResponse(
            "An error occurred while retrieving clinical trials: " + error,
            { isError: true }
          );
        }
      }
    );
  }
}

// ---------------------------------------------------------
// Flow of Logic
// ---------------------------------------------------------
// 1. User provides condition, location, and optionally trialId.
// 2. Query parameters are constructed with eligibility, safety, and ethics fields.
// 3. fetchClinicalTrials() calls ClinicalTrials.gov API and retrieves raw JSON.
// 4. studiesListedInfo() parses and formats the response.
// 5. Tool returns formatted trial info to be consumed by an LLM or user.
//
// --- Limitations ---
// - IRB approval is not always directly exposed by ClinicalTrials.gov API.
// - "Safety" fields may not capture the full risk/benefit profile (depends on study data).
// - The ethics filtering relies on oversight-related fields, which may be incomplete.
//


export const GetEthicalTrialsInstance = new GetEthicalClinicalTrials();

