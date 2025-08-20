

/*Selects and formats passed-in Clinical Trials.gov clinical-trial data field-names. Can optionally limit
the number of studies formatted and returned. To be used by MCP-tool.
*/

export const studiesListedEthicsSafetyEligibility = (studies: Object[], limit?: number) => 
    (limit ? studies.slice(0, limit) : studies).map((s: any, idx: number) => {

    const NCTId = s.protocolSection?.identificationModule?.nctId ?? null;
    const nctIdLink = NCTId ? `https://clinicaltrials.gov/study/${NCTId}` : "n/a";

    const title = s.protocolSection?.identificationModule?.briefTitle ?? "untitled study";

    const conditions = s.protocolSection?.conditionsModule?.conditions
    ? s.protocolSection.conditionsModule.conditions.join(", ") : "n/a";

    const overallStatus = s.protocolSection?.statusModule?.overallStatus ?? "n/a";
    
    const leadSponsor = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name ?? "n/a";
    const startDate = s.protocolSection?.statusModule?.startDateStruct?.date ?? "n/a";
    const completionDate = s.protocolSection?.statusModule?.primaryCompletionDateStruct?.date ?? "n/a";

    // Eligibility & participant criteria
    const eligibilityCriteria = s.protocolSection?.eligibilityModule?.eligibilityCriteria ?? "n/a";
    const sex = s.protocolSection?.eligibilityModule?.sex ?? "n/a";
    const genderDesc = s.protocolSection?.eligibilityModule?.genderDescription ?? "n/a";
    const minimumAge = s.protocolSection?.eligibilityModule?.minimumAge ?? "n/a";
    const maximumAge = s.protocolSection?.eligibilityModule?.maximumAge ?? "n/a";
    const healthyVolunteers = s.protocolSection?.eligibilityModule?.healthyVolunteers ?? "n/a";

    // Trial design / oversight
    const phases = s.protocolSection?.designModule?.phases?.join(", ") ?? "n/a"; // if multiple phases
    const primaryPurpose = s.protocolSection?.designModule?.primaryPurpose ?? "n/a";

    const isUnapprovedDevice = s.protocolSection?.oversightModule?.isUnapprovedDevice ?? false;

    // Trial design / oversight
    const oversightHasDMC = s.protocolSection?.oversightModule?.oversightHasDMC ?? false;
    const hasExpandedAccess = s.protocolSection?.oversightModule?.hasExpandedAccess ?? false;
    const isFDARegulatedDrug = s.protocolSection?.oversightModule?.isFdaRegulatedDrug ?? false;
    const isFDARegulatedDevice = s.protocolSection?.oversightModule?.isFdaRegulatedDevice ?? false;

    // Extract country, state, and city from first location with a defined value
    let locationCountry = "n/a";
    let locationState = "n/a";
    let locationCity = "n/a";
    const locations = s.protocolSection?.contactsLocationsModule?.locations ?? [];
    for (const loc of locations) {
        if (loc?.country && locationCountry === "n/a") {
            locationCountry = loc.country;
        }
        if (loc?.state && locationState === "n/a") {
            locationState = loc.state;
        }
        if (loc?.city && locationCity === "n/a") {
            locationCity = loc.city;
        }
        if (locationCountry !== "n/a" && locationState !== "n/a" && locationCity !== "n/a") break;
        }
    /*    */

    return (`Article ${idx + 1}. Title: ${title}. [${overallStatus}]
    - Location: ${locationCity}, ${locationState}, ${locationCountry}
    - Lead Sponsor: ${leadSponsor} 
    - Duration: ${startDate} - ${completionDate}
    - Conditions: ${conditions}
    - Inclusion/Exclusion Criteria: ${eligibilityCriteria}
    - Additional Eligibility Details:
        • Sex: ${sex}
        • Sex/Gender Description: ${genderDesc}
        • Age Range: ${minimumAge} - ${maximumAge}
        • Healthy Volunteers: ${healthyVolunteers}
    - Phases: ${phases}
    - Primary Purpose: ${primaryPurpose}
    - Oversight / Regulatory Info:
        • Unapproved Device: ${isUnapprovedDevice ? "Yes" : "No"}
        • Data Monitoring Committee: ${oversightHasDMC ? "Yes" : "No"}
        • Expanded Access: ${hasExpandedAccess ? "Yes" : "No"}
        • FDA Regulated Drug: ${isFDARegulatedDrug ? "Yes" : "No"}
        • FDA Regulated Device: ${isFDARegulatedDevice ? "Yes" : "No"}
    - More Info: ${nctIdLink}
    `); 
});
