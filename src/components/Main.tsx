import { Detail, getPreferenceValues, getSelectedText } from "@raycast/api";
import path from "path";
import fs from "fs";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { IOpenAIResponse } from "../interfaces/IOpenAIResponse";

interface Preferences {
  azureEndpoint: string;
  deploymentName: string;
  azureApiKey: string;
}

export default function Main({ name }: { name: string }) {
  const [selectedText, setSelectedText] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { azureEndpoint, deploymentName, azureApiKey } = getPreferenceValues<Preferences>();

  const filePath = path.resolve(__dirname, `assets/prompts/${name}.md`);
  const prompt = fs.readFileSync(filePath, "utf-8");

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Get selected text
        const text = await getSelectedText();
        if (!mounted) return;
        setSelectedText(text);

        if (!text) {
          setIsLoading(false);
          return;
        }

        const messages = [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: `The user's input:\n "${text}"`,
          },
        ];

        const response = await fetch(
          `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-05-01-preview`,
          {
            method: "POST",
            headers: {
              "api-key": azureApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages,
            }),
          },
        );

        if (!mounted) return;

        const data = (await response.json()) as IOpenAIResponse;
        setAnswer(data.choices[0]?.message?.content || "");
      } catch (error) {
        console.error("Error:", error);
        if (mounted) {
          setAnswer("Error occurred while processing the request.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [azureEndpoint, deploymentName, azureApiKey]);

  return (
    <Detail
      markdown={`Selected Text:\n\n ${selectedText}\n\n` + `The response from the assistant:\n\n` + `${answer}`}
      isLoading={isLoading}
    />
  );
}
