import axios from "axios";

const API_URL = "https://clinicaltrials.gov/api/v2";

export async function fetchClinicalTrials(args: Record<any, any>, nctID: string | null = null) {
    const res = await axios.get(`${API_URL}/studies${nctID ? `/${nctID}` : ""}`, {
        params: { ...args },
        headers: { Accept: "application/json" },
    });

    if (nctID) {
        return res.data
    }
    return res.data.studies;
}