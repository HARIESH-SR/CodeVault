function registerLeetCodeFunctionSnippets(monaco, editor) {
  const snippetsByKeyword = {
    leetcodefunction: {
      label: "leetcodefunction",
      doc: "LeetCode-style test case function runner",
      perLangSnippets: {
        python: `
#Type your function here

TestCases = int(input())

for _ in range(TestCases):

    # Type your code to get input here

    output_to_print = functionName(enter_the_args)  # Replace with function name and pass the input

    print(output_to_print)
        `.trim(),

        cpp: `
#include <iostream>
using namespace std;

//Type your function here

int main() {

    int TestCases;
    cin >> TestCases;

    while (TestCases--) {

        // Type your code to get input here

        auto output_to_print = functionName(enter_the_args); // Replace with function name and pass the input

        cout << output_to_print << endl;
    }
    return 0;
}
        `.trim(),

        java: `
import java.util.*;
public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int TestCases = sc.nextInt();

        while (TestCases-- > 0) {

            // Type your code to get input here

            var output_to_print = functionName(enter_the_args); // Replace with function name and pass the input

            System.out.println(output_to_print);
        }
    }

    //Type your function here
}
        `.trim(),

        c: `
#include <stdio.h>

int main() {

    int TestCases;
    scanf("%d", &TestCases);

    while (TestCases--) {

        // Type your code to get input here

        printf("%d\\n", output_to_print); // Replace with your function and arguments
    }
    return 0;
}
        `.trim()
      }
    },
    
    boiler: {
      label: "boiler",
      doc: "Basic boilerplate code",
      perLangSnippets: {
        python: `
def main():
    # Your code starts here
    pass

if __name__ == "__main__":
    main()
        `.trim(),

        cpp: `
#include <iostream>
using namespace std;

int main() {
    // Your code starts here
    return 0;
}
        `.trim(),

        java: `
public class Main {
    public static void main(String[] args) {
        // Your code starts here
    }
}
        `.trim(),

        c: `
#include <stdio.h>

int main() {
    // Your code starts here
    return 0;
}
        `.trim()
      }
    }
  };

  const allLangs = ["python", "cpp", "java", "c"];

  allLangs.forEach(lang => {
    monaco.languages.registerCompletionItemProvider(lang, {
     
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position).word;
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column - word.length,
            endColumn: position.column
          };

          const suggestions = [];

          for (const keyword in snippetsByKeyword) {
            if (keyword.startsWith(word)) {
              const item = snippetsByKeyword[keyword];
              const snippet = item.perLangSnippets[lang];
              if (snippet) {
                suggestions.push({
                  label: item.label,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: snippet,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: item.doc,
                  range,
                  sortText: "zzz" + item.label
                });
              }
            }
          }

          return { suggestions };
        } catch (e) {
          if (e.name !== "Canceled") console.error(e);
          return { suggestions: [] };
        }
      }
    });
  });
}
