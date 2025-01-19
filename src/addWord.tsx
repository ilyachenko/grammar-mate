import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { nanoid } from "nanoid";
import { LocalStorage } from "@raycast/api";
import { IOpenAIResponse } from "./interfaces/IOpenAIResponse";
import fetch from "node-fetch";

export interface DictionaryEntry {
  word: string;
  definition?: string;
  createdAt: string;
  id: string;
}

export default function AddWord() {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [definition, setDefinition] = useState<string>();
  const [showDetail, setShowDetail] = useState(false);
  const [currentWordId, setCurrentWordId] = useState<string>();
  const { azureEndpoint, deploymentName, azureApiKey } = getPreferenceValues<Preferences>();

  async function handleSubmit({ word }: { word: string }) {
    try {
      setIsLoading(true);
      setError(undefined);
      setDefinition(undefined);
      setShowDetail(false);

      const existingWordsStr = await LocalStorage.getItem<string>("dictionary-words");
      const existingWords: DictionaryEntry[] = existingWordsStr ? JSON.parse(existingWordsStr) : [];

      const response = await fetch(
        `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-05-01-preview`,
        {
          method: "POST",
          headers: {
            "api-key": azureApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `Provide a definition for the given word in the following markdown format:

## Meaning
Provide a detailed explanation, including meaning, usage, nuances, and cultural significance.

## Translation
Russian: [translation]

## Examples
- English: [example]
- Russian: [example]

## Memory Aid
[Share a trick or mnemonic to help remember it.]

Note: Ensure there are no spaces between the ## and the section titles to maintain proper markdown formatting.`,
              },
              {
                role: "user",
                content: `The user's input:\n "${word}"`,
              },
            ],
          }),
        },
      );

      const data = (await response.json()) as IOpenAIResponse;
      const newDefinition = data.choices[0].message.content;
      setDefinition(newDefinition);
      setShowDetail(true);

      const id = nanoid();

      setCurrentWordId(id);

      const newEntry: DictionaryEntry = {
        id,
        word: word.trim(),
        definition: newDefinition,
        createdAt: new Date().toISOString(),
      };

      const updatedWords = [newEntry, ...existingWords];
      await LocalStorage.setItem("dictionary-words", JSON.stringify(updatedWords));

      await showToast({
        style: Toast.Style.Success,
        title: "Word added successfully",
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteWord(wordId: string) {
    try {
      // Get existing words from LocalStorage
      const existingWordsStr = await LocalStorage.getItem<string>("dictionary-words");
      const existingWords: DictionaryEntry[] = existingWordsStr ? JSON.parse(existingWordsStr) : [];

      // Filter out the word to be deleted
      const updatedWords = existingWords.filter((entry) => entry.id !== wordId);

      // Update LocalStorage with the filtered list
      await LocalStorage.setItem("dictionary-words", JSON.stringify(updatedWords));

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Word deleted successfully",
      });

      // Reset the form state
      setShowDetail(false);
      setDefinition(undefined);
    } catch (e) {
      // Show error toast if deletion fails
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete word",
        message: String(e),
      });
    }
  }

  if (showDetail && definition) {
    return (
      <Detail
        markdown={definition}
        actions={
          <ActionPanel>
            <Action title="Add Another Word" onAction={() => setShowDetail(false)} />
            <Action
              title="Delete Word"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => handleDeleteWord(currentWordId)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isLoading ? (
        <Form.Description text="Loading definition..." />
      ) : (
        <Form.TextField id="word" title="Word" placeholder="Enter word" error={error} autoFocus />
      )}
    </Form>
  );
}
