import { useEffect } from 'react';

import { listMissingHashLinkTargets } from '~/common/utilities';
import {
  ClassDefinitionData,
  GeneratedData,
  TypeDocKind,
} from '~/components/plugins/api/APIDataTypes';
import APISectionClasses from '~/components/plugins/api/APISectionClasses';
import APISectionComponents from '~/components/plugins/api/APISectionComponents';
import APISectionConstants from '~/components/plugins/api/APISectionConstants';
import APISectionEnums from '~/components/plugins/api/APISectionEnums';
import APISectionInterfaces from '~/components/plugins/api/APISectionInterfaces';
import APISectionMethods from '~/components/plugins/api/APISectionMethods';
import APISectionNamespaces from '~/components/plugins/api/APISectionNamespaces';
import APISectionProps from '~/components/plugins/api/APISectionProps';
import APISectionTypes from '~/components/plugins/api/APISectionTypes';
import {
  getCommentContent,
  getPossibleComponentPropsNames,
} from '~/components/plugins/api/APISectionUtils';
import { usePageApiVersion } from '~/providers/page-api-version';
import versions from '~/public/static/constants/versions.json';
import { WithTestRequire } from '~/types/common';
import { P } from '~/ui/components/Text';

const { LATEST_VERSION } = versions;

type Props = {
  packageName?: string | string[];
  apiName?: string;
  forceVersion?: string;
  headersMapping?: Record<string, string>;
} & WithTestRequire;

const filterDataByKind = (
  entries: GeneratedData[] = [],
  kind: TypeDocKind | TypeDocKind[],
  additionalCondition: (entry: GeneratedData) => boolean = () => true
) =>
  entries.filter(
    (entry: GeneratedData) =>
      (Array.isArray(kind) ? kind.includes(entry.kind) : entry.kind === kind) &&
      additionalCondition(entry)
  );

const isHook = ({ name }: { name: string }) =>
  name.startsWith('use') &&
  // note(simek): hardcode this exception until the method will be renamed
  name !== 'useSystemBrightnessAsync';

const isListener = ({ name }: GeneratedData) =>
  name.endsWith('Listener') || name.endsWith('Listeners');

const isProp = ({ name }: GeneratedData) =>
  name.includes('Props') &&
  name !== 'ErrorRecoveryProps' &&
  name !== 'WebAnchorProps' &&
  name !== 'ScreenProps';

const componentTypeNames = new Set(['React.FC', 'ForwardRefExoticComponent', 'ComponentType']);

const isComponent = ({ type, extendedTypes, signatures }: GeneratedData) => {
  if (type?.name && componentTypeNames.has(type?.name)) {
    return true;
  } else if (extendedTypes?.length) {
    return extendedTypes[0].name === 'Component' || extendedTypes[0].name === 'PureComponent';
  } else if (signatures?.length) {
    const mainSignature = signatures[0];
    if (
      (mainSignature.parameters && mainSignature.parameters[0].name === 'props') ||
      (mainSignature.parameters && mainSignature.parameters[0].name === '__namedParameters')
    ) {
      return true;
    }
  }
  return false;
};

const isConstant = ({ name, type }: GeneratedData) =>
  !['default', 'Constants', 'EventEmitter', 'SharedObject', 'NativeModule'].includes(name) &&
  !(type?.name && componentTypeNames.has(type?.name));

const hasCategoryHeader = ({ signatures }: GeneratedData): boolean =>
  (signatures?.[0].comment?.blockTags &&
    signatures[0].comment.blockTags.length > 0 &&
    signatures[0].comment.blockTags.some(tag => tag?.tag === '@header')) ??
  false;

const groupByHeader = (entries: GeneratedData[]) => {
  return entries.reduce((group: Record<string, GeneratedData[]>, entry) => {
    const signature = entry.signatures[0];
    const header = getCommentContent(
      signature.comment?.blockTags?.filter(tag => tag.tag === '@header')[0].content ?? []
    );
    if (header) {
      group[header] = group[header] ?? [];
      group[header].push(entry);
    }
    return group;
  }, {});
};

const renderAPI = (
  sdkVersion: string,
  {
    packageName,
    apiName,
    testRequire = undefined,
    headersMapping = {},
  }: Omit<Props, 'forceVersion'>
) => {
  try {
    let data;

    if (Array.isArray(packageName)) {
      data = packageName
        .map(name => {
          const { children } = testRequire
            ? testRequire(`~/public/static/data/${sdkVersion}/${name}.json`)
            : require(`~/public/static/data/${sdkVersion}/${name}.json`);
          return children;
        })
        .flat()
        .sort((a: GeneratedData, b: GeneratedData) => a.name.localeCompare(b.name));
    } else {
      const { children } = testRequire
        ? testRequire(`~/public/static/data/${sdkVersion}/${packageName}.json`)
        : require(`~/public/static/data/${sdkVersion}/${packageName}.json`);
      data = children;
    }

    const methods = filterDataByKind(
      data,
      TypeDocKind.Function,
      entry =>
        !isListener(entry) && !isHook(entry) && !isComponent(entry) && !hasCategoryHeader(entry)
    );
    const eventSubscriptions = filterDataByKind(
      data,
      TypeDocKind.Function,
      entry => isListener(entry) && !hasCategoryHeader(entry)
    );

    const categorizedMethods = groupByHeader(
      filterDataByKind(
        data,
        TypeDocKind.Function,
        entry => !isComponent(entry) && hasCategoryHeader(entry)
      )
    );
    const hasCategorizedMethods = Object.keys(categorizedMethods).length > 0;
    const hasHeadersMapping = Object.keys(headersMapping).length;

    const types = filterDataByKind(
      data,
      [TypeDocKind.TypeAlias, TypeDocKind.TypeAlias_Legacy],
      entry =>
        !isProp(entry) &&
        !(entry?.variant === 'reference') &&
        !!(
          entry.type.declaration ??
          entry.type.types ??
          entry.type.type ??
          entry.type.typeArguments
        )
    );

    const props = filterDataByKind(
      data,
      [TypeDocKind.TypeAlias, TypeDocKind.TypeAlias_Legacy, TypeDocKind.Interface],
      entry =>
        isProp(entry) &&
        ([TypeDocKind.TypeAlias, TypeDocKind.TypeAlias_Legacy].includes(entry.kind)
          ? !!(entry.type.types ?? entry.type.declaration?.children)
          : true)
    );
    const defaultProps = filterDataByKind(
      data
        .filter((entry: GeneratedData) => entry.kind === TypeDocKind.Class)
        .map((entry: GeneratedData) => entry.children)
        .flat(),
      TypeDocKind.Property,
      entry => entry.name === 'defaultProps'
    )[0];

    const enums = filterDataByKind(data, TypeDocKind.Enum, entry => entry.name !== 'default');
    const interfaces = filterDataByKind(
      data,
      TypeDocKind.Interface,
      entry => !entry.name.includes('Props')
    );
    const constants = filterDataByKind(data, TypeDocKind.Variable, entry => isConstant(entry));

    const components = filterDataByKind(
      data,
      [TypeDocKind.Variable, TypeDocKind.Class, TypeDocKind.Function],
      entry => isComponent(entry)
    );
    const componentsPropNames = new Set(
      components.map(({ name, children }) => getPossibleComponentPropsNames(name, children)).flat()
    );

    const componentsProps = filterDataByKind(
      props,
      [TypeDocKind.TypeAlias, TypeDocKind.TypeAlias_Legacy, TypeDocKind.Interface],
      entry => componentsPropNames.has(entry.name)
    );

    const namespaces = filterDataByKind(data, TypeDocKind.Namespace);

    const classes = filterDataByKind(
      data,
      TypeDocKind.Class,
      entry => !isComponent(entry) && entry.name !== 'default'
    );

    const componentsChildren = components
      .map((cls: ClassDefinitionData) =>
        cls.children?.filter(
          child =>
            (child?.kind === TypeDocKind.Method || child?.kind === TypeDocKind.Property) &&
            !child.inheritedFrom &&
            child.name !== 'render' &&
            // note(simek): hide unannotated "private" methods
            !child.name.startsWith('_')
        )
      )
      .flat();

    const methodsNames = new Set(methods.map(method => method.name));
    const staticMethods = componentsChildren.filter(
      // note(simek): hide duplicate exports from class components
      method =>
        method?.kind === TypeDocKind.Method &&
        method?.flags?.isStatic === true &&
        !methodsNames.has(method.name) &&
        !isHook(method)
    );
    const componentMethods = componentsChildren
      .filter(
        method =>
          method?.kind === TypeDocKind.Method &&
          method?.flags?.isStatic !== true &&
          !method?.overwrites
      )
      .filter(Boolean);

    const hooks = filterDataByKind(
      [...data, ...componentsChildren].filter(Boolean),
      [TypeDocKind.Function, TypeDocKind.Property],
      entry => isHook(entry) && !hasCategoryHeader(entry)
    );

    return (
      <>
        {hasCategorizedMethods &&
          (hasHeadersMapping
            ? Object.entries(headersMapping).map(([key, header], index) => (
                <APISectionMethods
                  data={categorizedMethods[key]}
                  header={header}
                  key={`${header}-${index}`}
                  sdkVersion={sdkVersion}
                />
              ))
            : Object.entries(categorizedMethods).map(([key, data], index) => (
                <APISectionMethods
                  data={data}
                  header={key}
                  key={`${key}-${index}`}
                  sdkVersion={sdkVersion}
                />
              )))}
        <APISectionComponents
          data={components}
          sdkVersion={sdkVersion}
          componentsProps={componentsProps}
        />
        <APISectionMethods data={staticMethods} header="Static Methods" sdkVersion={sdkVersion} />
        <APISectionMethods
          data={componentMethods}
          header="Component Methods"
          sdkVersion={sdkVersion}
        />
        <APISectionConstants data={constants} apiName={apiName} sdkVersion={sdkVersion} />
        <APISectionMethods data={hooks} header="Hooks" sdkVersion={sdkVersion} />
        <APISectionClasses data={classes} sdkVersion={sdkVersion} />
        {props && componentsProps.length === 0 ? (
          <APISectionProps data={props} sdkVersion={sdkVersion} defaultProps={defaultProps} />
        ) : null}
        <APISectionMethods data={methods} apiName={apiName} sdkVersion={sdkVersion} />
        <APISectionMethods
          data={eventSubscriptions}
          apiName={apiName}
          header="Event Subscriptions"
          sdkVersion={sdkVersion}
        />
        <APISectionNamespaces data={namespaces} sdkVersion={sdkVersion} />
        <APISectionInterfaces data={interfaces} sdkVersion={sdkVersion} />
        <APISectionTypes data={types} sdkVersion={sdkVersion} />
        <APISectionEnums data={enums} />
      </>
    );
  } catch (error) {
    console.error(error);
    return <P>No API data file found, sorry!</P>;
  }
};

const isDevMode = process.env.NODE_ENV === 'development';

const APISection = ({ forceVersion, ...restProps }: Props) => {
  const { version } = usePageApiVersion();
  const resolvedVersion =
    forceVersion ??
    (version === 'unversioned' ? version : version === 'latest' ? LATEST_VERSION : version);

  useEffect(() => {
    if (isDevMode) {
      listMissingHashLinkTargets(restProps.apiName);
    }
  }, []);

  return renderAPI(resolvedVersion, restProps);
};

export default APISection;
