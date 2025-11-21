import nextConfig from "eslint-config-next";

const config = [
	...nextConfig,
	{
		rules: {
			"react/no-unescaped-entities": "off",
				"react-hooks/exhaustive-deps": "off",
				"react-hooks/set-state-in-effect": "off",
				"react-hooks/set-state-in-render": "off",
				"react-hooks/incompatible-library": "off",
				"@next/next/no-img-element": "off",
			"@next/next/no-page-custom-font": "off",
			"@next/next/no-head-element": "off",
		},
	},
];

export default config;
