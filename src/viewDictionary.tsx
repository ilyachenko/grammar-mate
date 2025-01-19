import {
  List,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  Detail,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";

interface DictionaryEntry {
  id: string;
  word: string;
  definition?: string;
  createdAt: string;
}

function WordDetail({ entry }: { entry: DictionaryEntry }) {
  const markdown = `
  # ${entry.word}
  
  ${entry.definition || "*No definition provided*"}
  
  ---
  Added on: ${new Date(entry.createdAt).toLocaleDateString()}
    `;

  return <Detail markdown={markdown} />;
}

export default function ViewDictionary() {
  const [words, setWords] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    loadWords();
  }, []);

  async function loadWords() {
    try {
      const wordsStr = await LocalStorage.getItem<string>("dictionary-words");
      const loadedWords: DictionaryEntry[] = wordsStr ? JSON.parse(wordsStr) : [];
      setWords(loadedWords);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load words",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(wordId: string) {
    try {
      const updatedWords = words.filter((w) => w.id !== wordId);
      await LocalStorage.setItem("dictionary-words", JSON.stringify(updatedWords));
      setWords(updatedWords);

      await showToast({
        style: Toast.Style.Success,
        title: "Word deleted successfully",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete word",
        message: String(e),
      });
    }
  }

  async function handleClearAll() {
    try {
      await LocalStorage.setItem("dictionary-words", JSON.stringify([]));
      setWords([]);

      await showToast({
        style: Toast.Style.Success,
        title: "Dictionary cleared successfully",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear dictionary",
        message: String(e),
      });
    }
  }

  const filteredWords = words.filter(
    (entry) =>
      entry.word.toLowerCase().includes(searchText.toLowerCase()) ||
      entry.definition?.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search words..."
      actions={
        <ActionPanel>
          <Action
            title="Clear Dictionary"
            icon={Icon.Trash}
            onAction={handleClearAll}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Dictionary" subtitle={`${filteredWords.length} words`}>
        {filteredWords.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.word}
            subtitle={entry.definition || "No definition"}
            accessories={[
              {
                text: new Date(entry.createdAt).toLocaleDateString(),
                tooltip: new Date(entry.createdAt).toLocaleString(),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="View Details" icon={Icon.Eye} onAction={() => push(<WordDetail entry={entry} />)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Copy Word"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={async () => {
                      await Clipboard.copy(entry.definition || "");
                      showToast({
                        style: Toast.Style.Success,
                        title: "Word copied to clipboard",
                      });
                    }}
                  />
                  {entry.definition && (
                    <Action
                      title="Copy Definition"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={async () => {
                        await Clipboard.copy(entry.definition || "");
                        showToast({
                          style: Toast.Style.Success,
                          title: "Definition copied to clipboard",
                        });
                      }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Word"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDelete(entry.id)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
