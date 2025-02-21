// The following code is a slight modification of code that was published by Dominic Vonk on
// GitHub (https://github.com/DominicVonk/vscode-variables, tag: v1.0.1) under the MIT license.
// A copy of the license is supplied below.
//
// MIT License
// Copyright (c) 2021 Dominic Vonk
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software
// and associated documentation files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
// PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.


import * as os from "os";
import * as process from "process";
import * as vscode from "vscode";

export function resolveVariables(string: string, recursive = false) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const activeFile = vscode.window.activeTextEditor?.document;
    const absoluteFilePath = activeFile?.uri.fsPath;
    const workspace = vscode.workspace.workspaceFolders?.[0];
    const activeWorkspace = workspaceFolders?.find((workspace) =>
        absoluteFilePath?.startsWith(workspace.uri.fsPath)
    )?.uri.fsPath;
    const homeDir = os.homedir();

    // ${userHome} - /home/your-username
    string = string.replace(/\${userHome}/g, homeDir);

    // ${workspaceFolder} - /home/your-username/your-project
    string = string.replace(/\${workspaceFolder}/g, workspace?.uri.fsPath ?? "");

    // ${workspaceFolder:name} - /home/your-username/your-project2
    string = string.replace(/\${workspaceFolder:(.*?)}/g, function (_, name) {
        return (
            workspaceFolders?.find((workspace) => workspace.name === name)?.uri
                .fsPath ?? ""
        );
    });

    // ${workspaceFolderBasename} - your-project
    string = string.replace(
        /\${workspaceFolderBasename}/g,
        workspace?.name ?? ""
    );

    // ${workspaceFolderBasename:name} - your-project2
    string = string.replace(
        /\${workspaceFolderBasename:(.*?)}/g,
        function (_, name) {
            return (
                workspaceFolders?.find((workspace) => workspace.name === name)?.name ??
                ""
            );
        }
    );

    // ${file} - /home/your-username/your-project/folder/file.ext
    string = string.replace(/\${file}/g, absoluteFilePath ?? "");

    // ${fileWorkspaceFolder} - /home/your-username/your-project
    string = string.replace(/\${fileWorkspaceFolder}/g, activeWorkspace ?? "");

    // ${relativeFile} - folder/file.ext
    string = string.replace(
        /\${relativeFile}/g,
        absoluteFilePath?.substring(activeWorkspace?.length ?? 0) ?? ""
    );

    // ${relativeFileDirname} - folder
    string = string.replace(
        /\${relativeFileDirname}/g,
        absoluteFilePath?.substring(
            activeWorkspace?.length ?? 0,
            absoluteFilePath?.lastIndexOf(os.platform() === "win32" ? "\\" : "/")
        ) ?? ""
    );

    // ${fileBasename} - file.ext
    string = string.replace(
        /\${fileBasename}/g,
        absoluteFilePath?.split("/")?.pop() ?? ""
    );

    // ${fileBasenameNoExtension} - file
    string = string.replace(
        /\${fileBasenameNoExtension}/g,
        absoluteFilePath?.split("/").pop()?.split(".")?.shift() ?? ""
    );
    // ${fileDirname} - /home/your-username/your-project/folder
    string = string.replace(
        /\${fileDirname}/g,
        absoluteFilePath?.split("/")?.slice(0, -1)?.join("/") ?? ""
    );

    // ${fileExtname} - .ext
    string = string.replace(
        /\${fileExtname}/g,
        absoluteFilePath?.split(".")?.pop() ?? ""
    );

    // ${lineNumber} - line number of the cursor
    string = string.replace(
        /\${lineNumber}/g,
        (vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.selection.start.line + 1
            : 0
        ).toString()
    );

    // ${selectedText} - text selected in your code editor
    string = string.replace(/\${selectedText}/g, function () {
        return (
            vscode.window.activeTextEditor?.document.getText(
                new vscode.Range(
                    vscode.window.activeTextEditor.selection.start,
                    vscode.window.activeTextEditor.selection.end
                )
            ) ?? ""
        );
    });

    // ${cwd} - current working directory
    string = string.replace(
        /\${cwd}/g,
        absoluteFilePath?.split("/")?.slice(0, -1)?.join("/") ?? ""
    );

    // ${execPath} - location of Code.exe
    string = string.replace(/\${execPath}/g, process.execPath);

    // ${pathSeparator} - / on macOS or linux, \ on Windows
    string = string.replace(
        /\${pathSeparator}/g,
        os.platform() === "win32" ? "\\" : "/"
    );

    // ${/} - short for ${pathSeparator}
    string = string.replace(/\${\/}/g, os.platform() === "win32" ? "\\" : "/");

    // ${env:VARIABLE} - environment variable
    string = string.replace(/\${env:(.*?)}/g, function (_match, captured) {
        return process.env[captured] ?? "";
    });

    // ${config:VARIABLE} - configuration variable
    string = string.replace(/\${config:(.*?)}/g, function (_match, captured) {
        return vscode.workspace.getConfiguration().get(captured, "");
    });

    if (string.match(/\${command:(.*?)}/)) {
        // async
        while (string.match(/\${command:(.*?)}/)) {
            const command = string.match(/\${command:(.*?)}/)![1];
            try {
                const result = vscode.commands.executeCommand(command);
                string = string.replace(
                    /\${command:(.*?)}/,
                    result !== undefined ? result + "" : ""
                );
            } catch (error) {
                string = string.replace(/\${command:(.*?)}/, "");
            }
        }
    }

    if (
        recursive &&
        string.match(
            /\${(workspaceFolder|workspaceFolder:(.*?)|workspaceFolderBase:(.*?)|workspaceFolderBasename|fileWorkspaceFolder|relativeFile|fileBasename|fileBasenameNoExtension|fileExtname|fileDirname|cwd|pathSeparator|lineNumber|selectedText|env:(.*?)|config:(.*?)|command:(.*?)|userHome)}/
        )
    ) {
        string = resolveVariables(string, recursive);
    }
    return string;
};
