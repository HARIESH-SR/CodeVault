function registerLeetCodeFunctionSnippets(monaco, editor) {
  const snippets = {
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
  };

  const supportedLangs = Object.keys(snippets);
  supportedLangs.forEach(lang => {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ["l"], // typing "l" will trigger
      provideCompletionItems: () => {
        return {
          suggestions: [
            {
              label: "leetcodefunction",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snippets[lang],
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "LeetCode-style test case function runner"
            }
          ]
        };
      }
    });
  });
}
