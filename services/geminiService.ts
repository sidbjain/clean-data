
import { GoogleGenAI, Type } from "@google/genai";
import { ChartConfig, DataRecord, CleaningResults } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const cleanDataWithGemini = async (csvData: string, userPrompt: string): Promise<CleaningResults> => {
    const model = 'gemini-2.5-flash';
    const prompt = `
        You are an expert data cleaning assistant. Your task is to process the following raw CSV data based on the user's instructions and produce a detailed report of your actions.

        User's instructions: "${userPrompt}"

        Raw CSV data:
        """
        ${csvData}
        """

        Your task:
        1.  Perform the cleaning operations as requested by the user. This may include removing rows, filling missing values, correcting data types, trimming whitespace, standardizing formats, etc.
        2.  Convert the final, cleaned data into a JSON array of objects, where each object is a row and keys are column headers. Ensure numerical values are numbers, not strings.
        3.  Create a "changeLog" object that details the actions you took.
            - The "summary" should be a human-readable, high-level overview of the cleaning operations performed (e.g., "Removed 5 rows with missing sales data, trimmed whitespace from the 'Product' column, and standardized all dates.").
            - The "removedRows" array should contain objects for EACH row that was removed. Each object must include:
                - "originalRow": The complete data of the row exactly as it appeared in the raw CSV data, represented as a JSON object.
                - "reason": A brief explanation for why the row was removed (e.g., "Missing value in 'Sales' column.").
        4.  Your final output MUST be a single JSON object containing two keys: "cleanedData" and "changeLog", adhering strictly to the provided JSON schema. Do not include any text, code blocks, or characters outside of this single JSON object.
    `;
    
    // Dynamically generate schema properties from CSV headers to avoid API errors with empty object properties.
    const headers = csvData.split('\n')[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dynamicObjectProperties = headers.reduce((acc, header) => {
        if (header) { // Ensure header is not an empty string
            acc[header] = { 
                type: Type.STRING, // Using STRING is safer, model will still format numbers correctly in JSON output
                description: `Value for the ${header} column.` 
            };
        }
        return acc;
    }, {} as Record<string, { type: Type; description: string }>);


    const schema = {
        type: Type.OBJECT,
        properties: {
            cleanedData: {
                type: Type.ARRAY,
                items: { 
                    type: Type.OBJECT,
                    properties: dynamicObjectProperties,
                 }
            },
            changeLog: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A high-level summary of all cleaning actions performed." },
                    removedRows: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                originalRow: { 
                                    type: Type.OBJECT, 
                                    properties: dynamicObjectProperties,
                                    description: "The original data of the removed row." 
                                },
                                reason: { type: Type.STRING, description: "The reason for the row's removal." }
                            },
                            required: ['originalRow', 'reason']
                        }
                    }
                },
                required: ['summary', 'removedRows']
            }
        },
        required: ['cleanedData', 'changeLog']
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const text = response.text.trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error cleaning data with Gemini:", error);
        throw new Error("Failed to clean data. The model returned an unexpected format.");
    }
};

export const generateDashboardConfigsWithGemini = async (cleanedData: DataRecord[], userPrompt: string): Promise<ChartConfig[]> => {
    const model = 'gemini-2.5-pro';
    const prompt = `
        You are an expert data analyst and visualization specialist. Your task is to analyze the provided JSON data and generate configurations for insightful charts based on the user's request.
        - Analyze the user's request to understand what they want to visualize.
        - Based on the data's structure and the user's request, suggest one or more appropriate charts to create a comprehensive dashboard.
        - For each chart, provide a configuration object that follows the specified JSON schema.
        - The 'dataKey' should be a column suitable for the X-axis or labels (e.g., categories, dates). It must exist in the data.
        - The 'valueKeys' should be an array of one or more NUMERIC columns to be plotted. These keys must exist in the data.
        - Choose appropriate chart types from 'bar', 'line', 'pie', 'area', 'scatter'.
        - Provide a concise, descriptive title for each chart.
        - Provide a short, insightful 'description' for each chart, explaining what the chart shows.
        - Ensure the output is a valid JSON array of chart configuration objects and nothing else.

        User's request: "${userPrompt}"

        Cleaned JSON data (sample of first 10 rows):
        """
        ${JSON.stringify(cleanedData.slice(0, 10), null, 2)}
        """
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "A concise, descriptive title for the chart." },
                chartType: { type: Type.STRING, description: "The type of chart, e.g., 'bar', 'line', 'pie'." },
                dataKey: { type: Type.STRING, description: "The key from the data to use for the x-axis or labels." },
                valueKeys: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of one or more numeric keys to plot."
                },
                description: { type: Type.STRING, description: "A short, insightful summary of what the chart shows." }
            },
            required: ['title', 'chartType', 'dataKey', 'valueKeys', 'description'],
        },
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const text = response.text.trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating dashboard configs with Gemini:", error);
        throw new Error("Failed to generate dashboard. The model returned an unexpected format.");
    }
};