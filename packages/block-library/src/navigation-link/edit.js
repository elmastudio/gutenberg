/**
 * External dependencies
 */
import classnames from 'classnames';
import { escape, get, head, find } from 'lodash';

/**
 * WordPress dependencies
 */
import { compose } from '@wordpress/compose';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, withDispatch, withSelect } from '@wordpress/data';
import {
	KeyboardShortcuts,
	PanelBody,
	Popover,
	TextControl,
	TextareaControl,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { rawShortcut, displayShortcut } from '@wordpress/keycodes';
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	BlockToolbarLinkControl,
	InnerBlocks,
	InspectorControls,
	RichText,
	__experimentalLinkControl as LinkControl,
	__experimentalBlock as Block,
} from '@wordpress/block-editor';
import { isURL, prependHTTP } from '@wordpress/url';
import { Fragment, useState, useEffect, useRef } from '@wordpress/element';
import { placeCaretAtHorizontalEdge } from '@wordpress/dom';
import { link as linkIcon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { ToolbarSubmenuIcon, ItemSubmenuIcon } from './icons';

function NavigationLinkEdit( {
	attributes,
	hasDescendants,
	isSelected,
	isExperimentalNavScreen = false,
	isImmediateParentOfSelectedBlock,
	isParentOfSelectedBlock,
	setAttributes,
	showSubmenuIcon,
	insertLinkBlock,
	textColor,
	backgroundColor,
	rgbTextColor,
	rgbBackgroundColor,
	selectedBlockHasDescendants,
	userCanCreatePages = false,
	insertBlocksAfter,
	mergeBlocks,
	onReplace,
} ) {
	const { label, opensInNewTab, url, description, rel } = attributes;
	const link = {
		url,
		opensInNewTab,
	};
	const { saveEntityRecord } = useDispatch( 'core' );
	const [ isLinkOpen, setIsLinkOpen ] = useState( false );
	const itemLabelPlaceholder = __( 'Add link…' );
	const ref = useRef();

	// Show the LinkControl on mount if the URL is empty
	// ( When adding a new menu item)
	// This can't be done in the useState call because it cconflicts
	// with the autofocus behavior of the BlockListBlock component.
	useEffect( () => {
		if ( ! url ) {
			setIsLinkOpen( true );
		}
	}, [] );

	/**
	 * The hook shouldn't be necessary but due to a focus loss happening
	 * when selecting a suggestion in the link popover, we force close on block unselection.
	 */
	useEffect( () => {
		if ( ! isSelected ) {
			setIsLinkOpen( false );
		}
	}, [ isSelected ] );

	// If the LinkControl popover is open and the URL has changed, close the LinkControl and focus the label text.
	useEffect( () => {
		if ( isLinkOpen && url ) {
			// Does this look like a URL and have something TLD-ish?
			if (
				isURL( prependHTTP( label ) ) &&
				/^.+\.[a-z]+/.test( label )
			) {
				// Focus and select the label text.
				selectLabelText();
			} else {
				// Focus it (but do not select).
				placeCaretAtHorizontalEdge( ref.current, true );
			}
		}
	}, [ url ] );

	/**
	 * Focus the Link label text and select it.
	 */
	function selectLabelText() {
		ref.current.focus();
		const selection = window.getSelection();
		const range = document.createRange();
		// Get the range of the current ref contents so we can add this range to the selection.
		range.selectNodeContents( ref.current );
		selection.removeAllRanges();
		selection.addRange( range );
	}

	async function handleCreatePage( pageTitle ) {
		const type = 'page';
		const page = await saveEntityRecord( 'postType', type, {
			title: pageTitle,
			status: 'publish',
		} );

		return {
			id: page.id,
			type,
			title: page.title.rendered,
			url: page.link,
		};
	}

	return (
		<Fragment>
			{ isExperimentalNavScreen && isLinkOpen && (
				<BlockToolbarLinkControl
					initialLink={ link }
					createSuggestion={ handleCreatePage }
					close={ () => setIsLinkOpen( false ) }
					onChange={ setAttributes }
				/>
			) }
			<BlockControls>
				<ToolbarGroup>
					<KeyboardShortcuts
						bindGlobal
						shortcuts={ {
							[ rawShortcut.primary( 'k' ) ]: () =>
								setIsLinkOpen( true ),
						} }
					/>
					<ToolbarButton
						name="link"
						icon={ linkIcon }
						title={ __( 'Link' ) }
						shortcut={ displayShortcut.primary( 'k' ) }
						onClick={ () => setIsLinkOpen( true ) }
					/>
					<ToolbarButton
						name="submenu"
						icon={ <ToolbarSubmenuIcon /> }
						title={ __( 'Add submenu' ) }
						onClick={ insertLinkBlock }
					/>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={ __( 'Link settings' ) }>
					<TextareaControl
						value={ description || '' }
						onChange={ ( descriptionValue ) => {
							setAttributes( { description: descriptionValue } );
						} }
						label={ __( 'Description' ) }
						help={ __(
							'The description will be displayed in the menu if the current theme supports it.'
						) }
					/>
					<TextControl
						value={ rel || '' }
						onChange={ ( relValue ) => {
							setAttributes( { rel: relValue } );
						} }
						label={ __( 'Link rel' ) }
						autoComplete="off"
					/>
				</PanelBody>
			</InspectorControls>
			<Block.li
				className={ classnames( {
					'is-editing': isSelected || isParentOfSelectedBlock,
					'is-selected': isSelected,
					'has-link': !! url,
					'has-child': hasDescendants,
					'has-text-color': rgbTextColor,
					[ `has-${ textColor }-color` ]: !! textColor,
					'has-background': rgbBackgroundColor,
					[ `has-${ backgroundColor }-background-color` ]: !! backgroundColor,
				} ) }
				style={ {
					color: rgbTextColor,
					backgroundColor: rgbBackgroundColor,
				} }
			>
				<div className="wp-block-navigation-link__content">
					<RichText
						ref={ ref }
						identifier="label"
						className="wp-block-navigation-link__label"
						value={ label }
						onChange={ ( labelValue ) =>
							setAttributes( { label: labelValue } )
						}
						onMerge={ mergeBlocks }
						onReplace={ onReplace }
						__unstableOnSplitAtEnd={ () =>
							insertBlocksAfter(
								createBlock( 'core/navigation-link' )
							)
						}
						placeholder={ itemLabelPlaceholder }
						keepPlaceholderOnFocus
						withoutInteractiveFormatting
						allowedFormats={ [
							'core/bold',
							'core/italic',
							'core/image',
							'core/strikethrough',
						] }
					/>
					{ ! isExperimentalNavScreen && isLinkOpen && (
						<Popover
							position="bottom center"
							onClose={ () => setIsLinkOpen( false ) }
						>
							<LinkControl
								className="wp-block-navigation-link__inline-link-input"
								value={ link }
								showInitialSuggestions={ true }
								withCreateSuggestion={ userCanCreatePages }
								createSuggestion={ handleCreatePage }
								onChange={ ( {
									title: newTitle = '',
									url: newURL = '',
									opensInNewTab: newOpensInNewTab,
									id,
								} = {} ) =>
									setAttributes( {
										url: encodeURI( newURL ),
										label: ( () => {
											const normalizedTitle = newTitle.replace(
												/http(s?):\/\//gi,
												''
											);
											const normalizedURL = newURL.replace(
												/http(s?):\/\//gi,
												''
											);
											if (
												newTitle !== '' &&
												normalizedTitle !==
													normalizedURL &&
												label !== newTitle
											) {
												return escape( newTitle );
											} else if ( label ) {
												return label;
											}
											// If there's no label, add the URL.
											return escape( normalizedURL );
										} )(),
										opensInNewTab: newOpensInNewTab,
										id,
									} )
								}
							/>
						</Popover>
					) }
				</div>
				{ showSubmenuIcon && (
					<span className="wp-block-navigation-link__submenu-icon">
						<ItemSubmenuIcon />
					</span>
				) }
				<InnerBlocks
					allowedBlocks={ [ 'core/navigation-link' ] }
					renderAppender={
						( isSelected && hasDescendants ) ||
						( isImmediateParentOfSelectedBlock &&
							! selectedBlockHasDescendants )
							? InnerBlocks.DefaultAppender
							: false
					}
					__experimentalTagName="ul"
					__experimentalAppenderTagName="li"
					__experimentalPassedProps={ {
						className: classnames(
							'wp-block-navigation__container',
							{
								'is-parent-of-selected-block': isParentOfSelectedBlock,
							}
						),
					} }
				/>
			</Block.li>
		</Fragment>
	);
}

/**
 * Returns the color object matching the slug, or undefined.
 *
 * @param {Array}  colors      The editor settings colors array.
 * @param {string} colorSlug   A string containing the color slug.
 * @param {string} customColor A string containing the custom color value.
 *
 * @return {Object} Color object included in the editor settings colors, or Undefined.
 */
const getColorObjectByColorSlug = ( colors, colorSlug, customColor ) => {
	if ( customColor ) {
		return customColor;
	}

	if ( ! colors || ! colors.length ) {
		return;
	}

	return get( find( colors, { slug: colorSlug } ), 'color' );
};

export default compose( [
	withSelect( ( select, ownProps ) => {
		const {
			getBlockAttributes,
			getClientIdsOfDescendants,
			hasSelectedInnerBlock,
			getBlockParentsByBlockName,
			getSelectedBlockClientId,
			getSettings,
		} = select( 'core/block-editor' );
		const { clientId } = ownProps;
		const rootBlock = head(
			getBlockParentsByBlockName( clientId, 'core/navigation' )
		);
		const navigationBlockAttributes = getBlockAttributes( rootBlock );
		const isExperimentalNavScreen = get(
			getSettings(),
			'__experimentalNavigationScreen',
			false
		);
		const colors = get( getSettings(), 'colors', [] );
		const hasDescendants = !! getClientIdsOfDescendants( [ clientId ] )
			.length;
		const showSubmenuIcon =
			!! navigationBlockAttributes.showSubmenuIcon && hasDescendants;
		const isParentOfSelectedBlock = hasSelectedInnerBlock( clientId, true );
		const isImmediateParentOfSelectedBlock = hasSelectedInnerBlock(
			clientId,
			false
		);
		const selectedBlockId = getSelectedBlockClientId();
		const selectedBlockHasDescendants = !! getClientIdsOfDescendants( [
			selectedBlockId,
		] )?.length;

		const userCanCreatePages = select( 'core' ).canUser(
			'create',
			'pages'
		);

		return {
			isExperimentalNavScreen,
			isParentOfSelectedBlock,
			isImmediateParentOfSelectedBlock,
			hasDescendants,
			selectedBlockHasDescendants,
			showSubmenuIcon,
			textColor: navigationBlockAttributes.textColor,
			backgroundColor: navigationBlockAttributes.backgroundColor,
			userCanCreatePages,
			rgbTextColor: getColorObjectByColorSlug(
				colors,
				navigationBlockAttributes.textColor,
				navigationBlockAttributes.customTextColor
			),
			rgbBackgroundColor: getColorObjectByColorSlug(
				colors,
				navigationBlockAttributes.backgroundColor,
				navigationBlockAttributes.customBackgroundColor
			),
		};
	} ),
	withDispatch( ( dispatch, ownProps, registry ) => {
		return {
			insertLinkBlock() {
				const { clientId } = ownProps;

				const { insertBlock } = dispatch( 'core/block-editor' );

				const { getClientIdsOfDescendants } = registry.select(
					'core/block-editor'
				);
				const navItems = getClientIdsOfDescendants( [ clientId ] );
				const insertionPoint = navItems.length ? navItems.length : 0;

				const blockToInsert = createBlock( 'core/navigation-link' );

				insertBlock( blockToInsert, insertionPoint, clientId );
			},
		};
	} ),
] )( NavigationLinkEdit );
