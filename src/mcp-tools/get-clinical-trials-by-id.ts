import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { IMcpTool } from "../../IMcpTool";
import { createTextResponse } from "../../mcp-utilities";
import { studiesListedInfo } from "../utils/studies-listed-info";
import { fetchClinicalTrials } from "../utils/fetch-clinical-trials";

class GetClinicalTrialById implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.tool(
      "get_clinical_trials_by_id",
      "Retrieves a single clinical trial with search field parameters.",
      {
        nctID: z
          .string()
          .describe("The NCT ID of the clinical trial study"),
        searchField: z
          .string()
          .optional()
          .describe("The field to search in the clinical trial study (optional)"),
      },
      async ({ nctID, searchField }) => {
        try {
            const args = {}
            const study = await fetchClinicalTrials(args, nctID);
            // TODO: parse through this study using searchField if provided

            const formattedStudy = studiesListedInfo([study]);
            return createTextResponse(`Clinical trial with ID ${nctID}: \n${formattedStudy}`);
        } catch (error) {
          console.error("Unexpected error:", error);
          return createTextResponse(
            "An error occurred while retrieving clinical trial with ID " + nctID + error,
            { isError: true }
          );
        }
      }
    );
  }
}

export const GetClinicalTrialByIdInstance = new GetClinicalTrialById();
