import { ConfigurationChangeEvent, ConfigurationScope, Uri, WorkspaceFolder } from 'vscode';
import { getInterpreterDetails } from './python';
import { LoggingLevelSettingType } from './log/types';
import { getConfiguration, getWorkspaceFolders } from './vscodeapi';

export interface ISettings {
    workspace: string;
    logLevel: LoggingLevelSettingType;
    args: string[];
    path: string[];
    interpreter: string[];
    importStrategy: string;
    showNotifications: string;
    organizeImports: boolean;
    fixAll: boolean;
}

export async function getExtensionSettings(namespace: string): Promise<ISettings[]> {
    const settings: ISettings[] = [];
    const workspaces = getWorkspaceFolders();

    for (const workspace of workspaces) {
        const workspaceSetting = await getWorkspaceSettings(namespace, workspace.uri);
        settings.push({
            workspace: workspace.uri.toString(),
            ...workspaceSetting,
        });
    }

    return settings;
}
  
function resolveWorkspace(resource?: Uri, value: string): string {
    return value.replace('${workspaceFolder}', uri.fsPath);
}

export function getInterpreterFromSetting(namespace: string): string[] | undefined {
    const config = getConfiguration(namespace);
    return config.get<string[]>('interpreter');
}

export function getArgsFromSetting(namespace: string, resource?: Uri): string[] | undefined {
    const config = getConfiguration(namespace, resource);
    return config.get<string[]>('args');
}

export async function getWorkspaceSettings(namespace: string, resource?: Uri): Promise<Omit<ISettings, 'workspace'>> {
    const config = getConfiguration(namespace, resource);

    let interpreter: string[] | undefined = getInterpreterFromSetting(namespace);
    if (interpreter === undefined || interpreter.length === 0) {
        interpreter = (await getInterpreterDetails(resource)).path;
    }

    let args: string[] | undefined = getArgsFromSetting(namespace);
    if (args !== undefined && interpreter.length !== 0) {
        args = args.map((s) => resolveWorkspace(resource, s));
    }

    return {
        logLevel: config.get<LoggingLevelSettingType>(`logLevel`) ?? 'error',
        args: args ?? [],
        path: config.get<string[]>(`path`) ?? [],
        interpreter: interpreter ?? [],
        importStrategy: config.get<string>(`importStrategy`) ?? 'fromEnvironment',
        showNotifications: config.get<string>(`showNotifications`) ?? 'off',
        organizeImports: config.get<boolean>(`organizeImports`) ?? true,
        fixAll: config.get<boolean>(`fixAll`) ?? true,
    };
}

export async function getGlobalSettings(namespace: string): Promise<Omit<ISettings, 'workspace'>> {
    const config = getConfiguration(namespace);

    let interpreter: string[] | undefined = getInterpreterFromSetting(namespace);

    return {
        logLevel: config.get<LoggingLevelSettingType>(`logLevel`) ?? 'error',
        args: config.get<string[]>(`args`) ?? [],
        path: config.get<string[]>(`path`) ?? [],
        interpreter: interpreter ?? [],
        importStrategy: config.get<string>(`importStrategy`) ?? 'fromEnvironment',
        showNotifications: config.get<string>(`showNotifications`) ?? 'off',
        organizeImports: config.get<boolean>(`organizeImports`) ?? true,
        fixAll: config.get<boolean>(`fixAll`) ?? true,
    };
}

export function checkIfConfigurationChanged(e: ConfigurationChangeEvent, namespace: string): boolean {
    const settings = [
        `${namespace}.trace`,
        `${namespace}.args`,
        `${namespace}.path`,
        `${namespace}.interpreter`,
        `${namespace}.importStrategy`,
        `${namespace}.showNotifications`,
        `${namespace}.organizeImports`,
        `${namespace}.fixAll`,
    ];
    return settings.some((s) => e.affectsConfiguration(s));
}
