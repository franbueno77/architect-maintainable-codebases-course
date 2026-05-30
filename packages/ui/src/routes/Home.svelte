<script lang="ts">
interface Item {
	label: string;
	description: string;
	detail?: string;
	code?: string;
}

interface Section {
	id: string;
	title: string;
	subtitle: string;
	items: Item[];
}

const sections: Section[] = [
	{
		id: 'typescript',
		title: 'TypeScript · Monorepo Config',
		subtitle: 'Cómo está estructurada la configuración TypeScript del proyecto y qué significa cada opción',
		items: [
			{
				label: 'composite: true',
				description:
					'Activa el modo Project References de TypeScript. Es el flag que convierte un paquete en un proyecto independiente y reutilizable dentro del monorepo.',
				detail:
					'Cuando está activo, TypeScript obliga a que declaration: true esté habilitado y produce un archivo .tsbuildinfo que actúa como caché de compilación. En la siguiente compilación, tsc --build solo recompila los archivos que cambiaron, no todo el proyecto. Sin este flag, otros paquetes no pueden referenciarlo como dependencia tipada.',
				code: '// packages/models/tsconfig.build.json\n{\n  "compilerOptions": {\n    "composite": true,\n    "declaration": true,\n    "declarationMap": true,\n    "outDir": "dist",\n    "rootDir": "src"\n  }\n}',
			},
			{
				label: 'references',
				description:
					'Declara explícitamente que un paquete depende de otro. TypeScript usa esta información para entender el grafo de dependencias del monorepo.',
				detail:
					'Sin references, cada paquete corre su propio tsc de forma independiente y son ciegos entre sí. Con references, TypeScript sabe que ui depende de models y puede detectar errores de tipo cross-package: si cambias el tipo de un campo en models, el check de ui falla inmediatamente. Además, tsc --build resuelve el orden de compilación automáticamente — primero models, luego ui.',
				code: '// packages/ui/tsconfig.app.json\n{\n  "references": [\n    { "path": "../models/tsconfig.build.json" }\n  ]\n}',
			},
			{
				label: 'tsconfig.build.json (models)',
				description:
					'Configuración específica para el build de producción del paquete models. Es diferente al tsconfig.json raíz porque necesita emitir archivos.',
				detail:
					'La clave es noEmit: false — el tsconfig general suele tener noEmit: true para solo verificar tipos sin generar archivos. En el build, necesitamos que TypeScript genere los .d.ts en dist/ para que ui pueda consumirlos. También incluye declarationMap: true para que los editores puedan navegar al código fuente original desde ui.',
			},
			{
				label: 'tsconfig.app.json (ui)',
				description:
					'El tsconfig que usa svelte-check para el type-checking de ui. Contiene composite: true y references a models.',
				detail:
					'Este fue el archivo clave para que la detección de errores cross-package funcionara. El script check de ui ejecuta svelte-check --tsconfig ./tsconfig.app.json — si este archivo no tiene references, svelte-check no sabe que models existe como dependencia y no puede detectar incompatibilidades. El tsconfig.json general del paquete también tiene references, pero svelte-check no lo usa por defecto.',
			},
			{
				label: 'Flujo de detección de errores',
				description:
					'El proceso completo para que un cambio de tipo en models sea detectado en ui sin necesidad de ejecutar el build completo.',
				detail:
					'1. Se modifica un tipo en packages/models/src/seed-packet.model.ts\n2. pnpm --filter=models build regenera los .d.ts en dist/ con el nuevo tipo\n3. pnpm --filter=ui check ejecuta svelte-check que lee los nuevos .d.ts\n4. Si ui usa ese tipo de forma incompatible, svelte-check falla con el error\n\nSin el paso 2, svelte-check seguiría leyendo los .d.ts anteriores y no detectaría el cambio. Por eso el order importa.',
				code: '# Flujo manual\npnpm --filter=models build\npnpm --filter=ui check\n\n# O todo de una vez\npnpm build && pnpm check',
			},
		],
	},
	{
		id: 'api-extractor',
		title: 'API Extractor',
		subtitle: 'Herramienta de Microsoft para gestionar, versionar y documentar la API pública de una librería TypeScript',
		items: [
			{
				label: '¿Qué es?',
				description:
					'API Extractor es una herramienta que analiza los .d.ts compilados de un paquete TypeScript y genera tres artefactos: un reporte de API, un modelo de documentación y un rollup de tipos.',
				detail:
					'A diferencia de TypeScript, que verifica que el código sea correcto, API Extractor verifica que el contrato de la API sea estable. Es especialmente útil en monorepos donde un paquete (models) es consumido por otros (ui, server) — actúa como una red de seguridad que impide que cambios accidentales en los tipos lleguen a los consumidores sin revisión.',
			},
			{
				label: 'apiReport → models.api.md',
				description:
					'Genera un archivo Markdown legible que describe toda la API pública del paquete. Este archivo se commitea a git y actúa como el contrato oficial de la API.',
				detail:
					'El mecanismo de detección funciona así: al ejecutar api-extractor run, se genera un models.api.md temporal en temp/ y se compara con el que está en etc/ (commiteado). Si difieren, en modo producción (sin --local) el build falla. Esto obliga a que cualquier cambio de API sea una decisión consciente — hay que actualizar el .api.md y commitearlo explícitamente.',
				code: '# Modo local (solo warning, no falla)\npnpm exec api-extractor run --local --verbose\n\n# Modo CI (falla si la API cambió)\npnpm exec api-extractor run',
			},
			{
				label: 'docModel → models.api.json',
				description:
					'Serializa toda la API en formato JSON estructurado. Sirve como fuente de verdad para generar documentación automática.',
				detail:
					'El archivo .api.json contiene la API completa con todos sus tipos, firmas, etiquetas y comentarios. Herramientas como api-documenter pueden leerlo para generar documentación en HTML o Markdown. En este proyecto privado su uso principal es el de baseline para la comparación de cambios.',
			},
			{
				label: 'dtsRollup',
				description:
					'Fusiona todos los .d.ts dispersos generados por TypeScript en un único archivo por nivel de estabilidad.',
				detail:
					'TypeScript genera un .d.ts por cada archivo fuente (index.d.ts, seed-packet.model.d.ts, etc.). API Extractor los combina en un solo archivo, lo que simplifica el consumo del paquete. Los cuatro niveles son: untrimmed (todo), alpha (@public+@beta+@alpha), beta (@public+@beta), public (solo @public). En este proyecto privado solo untrimmed tiene sentido.',
				code: '// api-extractor.json\n"dtsRollup": {\n  "enabled": true,\n  "untrimmedFilePath": "<projectFolder>/dist/<unscopedPackageName>.untrimmed.d.ts",\n  "betaTrimmedFilePath": "<projectFolder>/dist/<unscopedPackageName>-beta.d.ts",\n  "publicTrimmedFilePath": "<projectFolder>/dist/<unscopedPackageName>-public.d.ts"\n}',
			},
			{
				label: 'Etiquetas de estabilidad',
				description:
					'Anotaciones JSDoc que comunican el nivel de estabilidad de cada tipo exportado: @public, @beta, @alpha, @internal.',
				detail:
					'@public significa que el tipo es parte de la API estable y no cambiará sin un breaking change intencionado. @beta indica que funciona pero puede cambiar. @alpha es experimental y puede desaparecer. @internal significa que no debería usarse fuera del paquete.\n\nIMPORTANTE: estas etiquetas no son restricciones técnicas — TypeScript no bloquea el acceso a un @internal. Solo se hacen cumplir si el consumidor usa un .d.ts trimmed que no incluye ese tipo.',
				code: '/**\n * @public\n */\nexport interface SeedPacketModel { ... }\n\n/**\n * @beta\n */\nexport interface Distance { ... }',
			},
			{
				label: 'Warnings comunes',
				description:
					'Errores frecuentes al configurar API Extractor por primera vez.',
				detail:
					'ae-missing-release-tag: un tipo exportado no tiene etiqueta. El JSDoc debe estar pegado directamente al tipo sin líneas en blanco entre el comentario y la declaración.\n\nae-incompatible-release-tags: un tipo @public referencia un tipo @internal. Solución: inlinear el tipo interno o subirlo a @public.\n\nae-internal-missing-underscore: por convención, los tipos @internal deben llamarse _NombreTipo con prefijo guión bajo.',
			},
			{
				label: 'Cómo ejecutarlo en este proyecto',
				description:
					'Pasos para ejecutar API Extractor en packages/models desde la raíz del monorepo.',
				detail:
					'Antes de la primera ejecución hay que crear manualmente la carpeta etc/ dentro de packages/models — API Extractor no la crea automáticamente. La primera vez siempre generará el warning "API report was missing, a new file was created" — esto es normal, hay que commitear ese archivo como baseline.',
				code: '# Crear la carpeta la primera vez\nmkdir packages/models/etc\n\n# Ejecutar desde la raíz\npnpm --filter=@seeds/models exec api-extractor run --local --verbose',
			},
		],
	},
	{
		id: 'librerias',
		title: 'Librerías del monorepo',
		subtitle: 'Herramientas instaladas o evaluadas durante el curso, con su propósito y veredicto de uso',
		items: [
			{
				label: 'knip',
				description:
					'Detecta código muerto en el monorepo: exports no usados, dependencias declaradas en package.json pero no referenciadas, y archivos huérfanos.',
				detail:
					'Muy útil para mantener el monorepo limpio. En proyectos que crecen rápido es fácil que queden imports, exports o dependencias que ya nadie usa. knip lo detecta automáticamente analizando el grafo de imports. Se ejecuta con pnpm knip desde la raíz.',
			},
			{
				label: 'syncpack',
				description:
					'Verifica que las versiones de dependencias compartidas entre paquetes del monorepo sean consistentes.',
				detail:
					'Si models usa TypeScript ~5.8.3 y ui también usa TypeScript ~5.8.3, syncpack verifica que sean exactamente la misma versión. Sin esta herramienta es fácil que con el tiempo los paquetes diverjan en versiones, lo que puede causar comportamientos distintos o conflictos en el node_modules de pnpm. Se ejecuta con pnpm sync.',
			},
			{
				label: 'concurrently',
				description:
					'Ejecuta múltiples procesos en paralelo en la misma terminal, mostrando el output de cada uno con colores distintos.',
				detail:
					'Usado en el script dev de la raíz para arrancar los tres paquetes a la vez (server, models en watch mode, y ui con Vite). No entiende el grafo de dependencias — simplemente arranca todo a la vez. Para modo dev esto es suficiente porque models en watch mode recompilará automáticamente cuando cambie.',
				code: '"dev": "concurrently -n \\"Server,Models,Client\\" -c \\"yellow,blue\\" \\"pnpm --filter=server run dev\\" \\"pnpm --filter=models run dev\\" \\"pnpm --filter=ui run dev\\""',
			},
			{
				label: 'lerna',
				description:
					'Gestor de monorepos para versionado coordinado y publicación automática a npm de múltiples paquetes.',
				detail:
					'Evaluado durante el curso y descartado. Sus funciones principales son versionar paquetes automáticamente (subir major/minor/patch según los commits) y publicar a npm en el orden correcto según el grafo de dependencias. En este monorepo privado ninguna de las dos funciones es necesaria — pnpm workspaces ya gestiona el grafo de dependencias y los paquetes no se publican a npm.',
			},
			{
				label: 'nx · Qué es y ventajas',
				description:
					'Sistema de build avanzado para monorepos con caché de resultados, grafo de dependencias inteligente y ejecución de solo los paquetes afectados por un cambio.',
				detail:
					'Lerna lo instala como dependencia interna (nx@22.7.2). Sus tres ventajas principales son:\n\n1) Caché local — si models no cambió desde el último build, nx devuelve el resultado cacheado instantáneamente sin recompilar. El caché se guarda en .nx/cache. También existe caché remota (Nx Cloud) para compartirla entre máquinas del equipo y CI.\n\n2) Affected — nx affected --target=test detecta automáticamente qué paquetes cambiaron desde la rama base y solo ejecuta los tests de esos paquetes y sus dependientes. En un monorepo con 20 paquetes donde solo tocaste models, no tiene sentido testear server si no depende de models.\n\n3) Paralelismo inteligente — entiende el grafo de dependencias y ejecuta en paralelo todo lo que puede. models y server pueden buildear a la vez; ui espera automáticamente a que models termine porque depende de él. Sin nx, tú tienes que configurar este orden manualmente.',
				code: '# Ejecutar un target en todos los paquetes\nnpx nx run-many --target=build\nnpx nx run-many --target=test\nnpx nx run-many --target=build --target=test\n\n# Solo los paquetes afectados por cambios desde main\nnpx nx affected --target=build\nnpx nx affected --target=test\nnpx nx affected --target=build --dry-run  # ver sin ejecutar\n\n# Ejecutar en un paquete específico\nnpx nx build @seeds/models\nnpx nx test @seeds/ui\nnpx nx run @seeds/models:build\n\n# Utilidades\nnpx nx graph        # grafo de dependencias en el navegador\nnpx nx reset        # limpiar la caché',
			},
			{
				label: 'nx · Descubrimiento de targets',
				description:
					'Por defecto Nx lee los scripts del package.json de cada paquete para saber qué targets están disponibles. Si un paquete no tiene el script test, Nx lo ignora al ejecutar run-many --target=test.',
				detail:
					'Esto significa que el target solo existe si el script existe en package.json. Es la configuración más simple pero la menos flexible — no puedes configurar caché, inputs ni outputs granulares.\n\nLa alternativa es usar project.json, donde defines los targets explícitamente con executors. Esto desacopla los targets de los scripts y permite configurar la caché con precisión.',
				code: '// Sin project.json — Nx infiere targets desde package.json\n{\n  "scripts": {\n    "build": "tsc -p tsconfig.build.json",\n    "test": "vitest run",\n    "lint": "eslint ."\n  }\n}\n\n// Si quitas "test", npx nx run-many --target=test\n// simplemente ignora este paquete silenciosamente',
			},
			{
				label: 'nx · project.json y executors',
				description:
					'Archivo de configuración de Nx por paquete que permite definir targets con executors, independientemente de los scripts del package.json.',
				detail:
					'Un executor es una función que Nx ejecuta directamente — no delega en un script de package.json, sino que controla el proceso él mismo. Nx tiene executors built-in para las herramientas más comunes: @nx/js:tsc para TypeScript, @nx/vite:test para Vitest, @nx/eslint:lint para ESLint.\n\nVentaja principal: el target existe aunque no haya script en package.json, y puedes configurar inputs y outputs para afinar cuándo se invalida la caché.\n\nContrapartida: introduces dependencia en paquetes de Nx (@nx/js, @nx/eslint, etc.), lo que añade peso al monorepo.',
				code: '// packages/models/project.json\n{\n  "name": "@seeds/models",\n  "targets": {\n    "build": {\n      "executor": "@nx/js:tsc",\n      "options": {\n        "tsConfig": "packages/models/tsconfig.build.json"\n      },\n      "outputs": ["{projectRoot}/dist"]\n    },\n    "test": {\n      "executor": "@nx/vite:test",\n      "options": {\n        "configFile": "packages/models/vite.config.ts"\n      }\n    }\n  }\n}',
			},
			{
				label: 'nx · lintFilePatterns, inputs y outputs',
				description:
					'Opciones del executor @nx/eslint:lint que controlan qué archivos analizar y cómo gestionar la caché del target.',
				detail:
					'lintFilePatterns le dice al executor exactamente qué archivos pasar a ESLint. Sin esto, ESLint analiza todo lo que encuentre en el paquete.\n\ninputs define qué archivos se leen para ejecutar el target. Nx usa esto para saber cuándo la caché es válida — si ningún input cambió, devuelve el resultado cacheado sin ejecutar nada.\n\noutputs define qué archivos genera el target. En lint normalmente es el archivo de reporte si lo generas. Si el lint no produce ningún archivo, puedes poner [] y Nx cacheará basándose solo en los inputs.\n\nLa combinación inputs + outputs es lo que permite a Nx saber con precisión cuándo invalidar la caché.',
				code: '// packages/models/project.json\n{\n  "name": "@seeds/models",\n  "targets": {\n    "lint": {\n      "executor": "@nx/eslint:lint",\n      "options": {\n        "lintFilePatterns": [\n          "packages/models/src/**/*.ts"\n        ],\n        "outputFile": "reports/lint-models.json"\n      },\n      "inputs": [\n        "default",\n        "{workspaceRoot}/.eslintrc.json"\n      ],\n      "outputs": [\n        "{options.outputFile}"\n      ]\n    }\n  }\n}',
			},
			{
				label: 'nx · nx.json — configuración global',
				description:
					'Archivo de configuración raíz de Nx donde se definen defaults para todos los paquetes, configuración de caché y comportamiento del affected.',
				detail:
					'targetDefaults permite definir inputs y outputs por defecto para todos los targets del monorepo sin repetirlos en cada project.json. Por ejemplo, puedes decir que todos los targets build tienen como output la carpeta dist/.\n\naffectedConfig.defaultBase define contra qué rama comparar para calcular los paquetes afectados. Por defecto es main.',
				code: '// nx.json\n{\n  "targetDefaults": {\n    "build": {\n      "inputs": ["default", "^default"],\n      "outputs": ["{projectRoot}/dist"],\n      "dependsOn": ["^build"]\n    },\n    "test": {\n      "inputs": ["default"],\n      "cache": true\n    },\n    "lint": {\n      "inputs": [\n        "default",\n        "{workspaceRoot}/.eslintrc.json"\n      ],\n      "cache": true\n    }\n  },\n  "affected": {\n    "defaultBase": "main"\n  }\n}',
			},
			{
				label: '@microsoft/api-extractor',
				description:
					'La herramienta principal del curso para gestionar la API de packages/models. Instalada como devDependency en ese paquete.',
				detail:
					'Se configura mediante api-extractor.json en la raíz del paquete. Necesita que el build de TypeScript se haya ejecutado antes (los .d.ts deben existir en dist/). El archivo mainEntryPointFilePath apunta al .d.ts principal del paquete, que por defecto debería ser dist/index.d.ts.',
				code: '// api-extractor.json\n{\n  "mainEntryPointFilePath": "<projectFolder>/dist/index.d.ts",\n  "apiReport": { "enabled": true },\n  "docModel": { "enabled": true },\n  "dtsRollup": { "enabled": true }\n}',
			},
		],
	},
];
</script>

<div class="min-h-screen bg-gray-950 text-gray-100">
	<div class="max-w-6xl mx-auto flex gap-12 px-6 py-16">

		<!-- Sidebar -->
		<aside class="w-52 shrink-0">
			<nav class="sticky top-16 space-y-1">
				<p class="text-xs font-mono text-gray-600 uppercase tracking-widest mb-4">Secciones</p>
				{#each sections as section (section.id)}
					<a
						href="#{section.id}"
						class="block text-sm text-gray-500 hover:text-emerald-400 transition-colors py-1 leading-snug"
						onclick={(e) => {
							e.preventDefault();
							document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
						}}
					>
						{section.title}
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<header class="mb-16">
				<p class="text-xs font-mono text-emerald-400 tracking-widest uppercase mb-3">Architect Maintainable Codebases</p>
				<h1 class="text-4xl font-bold text-white mb-4">Notas del curso</h1>
				<p class="text-gray-400 text-lg">Resumen de conceptos, herramientas y configuraciones vistas.</p>
			</header>

			<div class="space-y-20">
				{#each sections as section (section.id)}
					<section id={section.id}>
						<div class="mb-8">
							<h2 class="text-2xl font-semibold text-white">{section.title}</h2>
							<p class="text-gray-500 text-sm mt-2">{section.subtitle}</p>
						</div>

						<div class="space-y-6">
							{#each section.items as item (item.label)}
								<div class="border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
									<code class="text-emerald-400 text-sm font-mono">{item.label}</code>
									<p class="text-gray-300 text-sm mt-3 leading-relaxed">{item.description}</p>
									{#if item.detail}
										<p class="text-gray-500 text-sm mt-3 leading-relaxed whitespace-pre-line">{item.detail}</p>
									{/if}
									{#if item.code}
										<pre class="mt-4 bg-gray-900 rounded-lg p-4 text-xs text-gray-400 overflow-x-auto font-mono leading-relaxed">{item.code}</pre>
									{/if}
								</div>
							{/each}
						</div>
					</section>

					<hr class="border-gray-800" />
				{/each}
			</div>

			<footer class="mt-16 pt-8 border-t border-gray-800">
				<p class="text-gray-600 text-sm font-mono">packages/models · packages/ui · packages/server</p>
			</footer>
		</div>

	</div>
</div>
