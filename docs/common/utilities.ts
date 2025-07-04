import GithubSlugger from 'github-slugger';
import { ReactNode, isValidElement, PropsWithChildren } from 'react';

import versions from '~/public/static/constants/versions.json';

const { BETA_VERSION, LATEST_VERSION } = versions;

function hasChildren(node: ReactNode) {
  return isValidElement<PropsWithChildren>(node);
}

/**
 * Converts any object to string accepted by _Slugger_.
 * This is needed, because sometimes we receive pure string node,
 * but sometimes (e.g. when using styled text), we receive whole object (React.Element)
 *
 * @param node React Node object to stringify
 */
export const toString = (node: ReactNode): string => {
  if (typeof node === 'string') {
    return node;
  } else if (Array.isArray(node)) {
    return node.map(toString).join('');
  } else if (hasChildren(node)) {
    return toString(node.props.children);
  } else {
    return '';
  }
};

export const generateSlug = (slugger: GithubSlugger, node: ReactNode, length = 7): string => {
  const stringToSlug = toString(node).split(' ').splice(0, length).join('-');

  // NOTE(jim): This will strip out commas from stringToSlug
  return slugger.slug(stringToSlug);
};

/**
 * Replace the version in the pathname from the URL.
 */
export const replaceVersionInUrl = (url: string, replaceWith: string) => {
  const urlArr = url.split('/');
  urlArr[2] = replaceWith;
  return urlArr.join('/');
};

/**
 * Get the user facing or human-readable version from the SDK version.
 * If you provide a `latestVersion` or `betaVersion`, matching entries will include the correct label in parentheses.
 */
export const getUserFacingVersionString = (
  version: string,
  latestVersion?: string,
  betaVersion?: string
): string => {
  const versionString = `SDK ${version?.slice(1, 3)}`;

  if (version === 'latest') {
    return latestVersion ? `${getUserFacingVersionString(latestVersion)} (Latest)` : 'Latest';
  } else if (version === betaVersion) {
    return `${versionString} (Beta)`;
  } else if (version === 'unversioned') {
    return 'Unversioned';
  }

  return versionString;
};

export const stripVersionFromPath = (path?: string) => {
  if (!path) {
    return path;
  }
  return path.replace(/\/versions\/[\w.]+/, '');
};

export const pathStartsWith = (name: string, path: string) => {
  return path.startsWith(`/${name}`);
};

export function listMissingHashLinkTargets(apiName?: string) {
  const contentLinks = document.querySelectorAll<HTMLAnchorElement>(
    `div.size-full.overflow-x-hidden.overflow-y-auto a`
  );

  const wantedHashes = Array.from(contentLinks)
    .map(link => {
      if (link.hostname !== 'localhost' || !link.href.startsWith(link.baseURI.split('#')[0])) {
        return '';
      }
      return link.hash.slice(1);
    })
    .filter(hash => hash !== '');

  const availableIDs = new Set(Array.from(document.querySelectorAll('*[id]')).map(link => link.id));
  const missingEntries = wantedHashes.filter(hash => !availableIDs.has(hash));

  if (missingEntries.length > 0) {
    /* eslint-disable no-console */
    console.group(`🚨 The following links targets are missing in the ${apiName} API reference:`);
    console.table(missingEntries);
    console.groupEnd();
    /* eslint-enable no-console */
  }
}

export function versionToText(version: string): string {
  if (version === 'unversioned') {
    return 'Next (unversioned)';
  } else if (version === 'latest') {
    return `${formatSdkVersion(LATEST_VERSION)} (latest)`;
  } else if (BETA_VERSION && version === BETA_VERSION.toString()) {
    return `${formatSdkVersion(BETA_VERSION.toString())} (beta)`;
  }

  return formatSdkVersion(version);
}

export function formatSdkVersion(version: string): string {
  return version.includes('v') ? `SDK ${version.slice(1, 3)}` : `SDK ${version}`;
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
