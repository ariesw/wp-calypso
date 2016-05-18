/**
 * External dependencies
 */
import React from 'react';
import ReactDom from 'react-dom';
import { connect } from 'react-redux';
import noop from 'lodash/noop';

/**
 * Internal dependencies
 */
import Crop from './image-editor-crop';
import MediaUtils from 'lib/media/utils';
import {
	getImageEditorTransform,
	getImageEditorFileInfo,
	getImageEditorCrop
} from 'state/ui/editor/media/imageEditor/selectors';
import { setImageEditorCropBounds } from 'state/ui/editor/media/imageEditor/actions';

const MediaModalImageEditorCanvas = React.createClass( {
	displayName: 'MediaModalImageEditorCanvas',

	propTypes: {
		src: React.PropTypes.string,
		mimeType: React.PropTypes.string,
		degrees: React.PropTypes.number,
		scaleX: React.PropTypes.number,
		scaleY: React.PropTypes.number,
		cropTopRatio: React.PropTypes.number,
		cropLeftRatio: React.PropTypes.number,
		cropWidthRatio: React.PropTypes.number,
		cropHeightRatio: React.PropTypes.number,
		setImageEditorCropBounds: React.PropTypes.func
	},

	getDefaultProps() {
		return {
			degrees: 0,
			scaleX: 1,
			scaleY: 1,
			cropTopRatio: 0,
			cropLeftRatio: 0,
			cropWidthRatio: 1,
			cropHeightRatio: 1,
			setImageEditorCropBounds: noop
		};
	},

	componentWillReceiveProps( newProps ) {
		if ( this.props.src !== newProps.src ) {
			this.initImage( newProps.src );
		}
	},

	componentDidMount() {
		if ( ! this.props.src ) {
			return;
		}

		this.initImage( this.props.src );
	},

	initImage( src ) {
		this.image = new Image();
		this.image.src = src;
		this.image.onload = this.onLoadComplete;
		this.image.onerror = this.onLoadComplete;
	},

	onLoadComplete( event ) {
		if ( event.type !== 'load' ) {
			return;
		}

		this.drawImage();
	},

	componentDidUpdate() {
		this.drawImage();
	},

	toBlob( callback ) {
		const canvas = ReactDom.findDOMNode( this.refs.canvas );
		const context = canvas.getContext( '2d' );
		const rotated = this.props.degrees % 180 !== 0;
		const imageWidth = rotated ? this.image.height : this.image.width;
		const imageHeight = rotated ? this.image.width : this.image.height;
		const croppedLeft = this.props.cropLeftRatio * imageWidth;
		const croppedTop = this.props.cropTopRatio * imageHeight;
		const croppedWidth = this.props.cropWidthRatio * imageWidth;
		const croppedHeight = this.props.cropHeightRatio * imageHeight;
		const imageData = context.getImageData(
			croppedLeft,
			croppedTop,
			croppedWidth,
			croppedHeight );
		const newCanvas = document.createElement( 'canvas' );

		newCanvas.width = croppedWidth;
		newCanvas.height = croppedHeight;

		const newContext = newCanvas.getContext( '2d' );
		newContext.putImageData( imageData, 0, 0 );

		MediaUtils.canvasToBlob( newCanvas, callback, this.props.mimeType, 1 );
	},

	drawImage() {
		if ( ! this.image ) {
			return;
		}

		const canvas = ReactDom.findDOMNode( this.refs.canvas );
		const imageWidth = this.image.width;
		const imageHeight = this.image.height;
		const rotated = this.props.degrees % 180 !== 0;

		//make sure the canvas draw area is the same size as the image
		canvas.width = rotated ? imageHeight : imageWidth;
		canvas.height = rotated ? imageWidth : imageHeight;

		this.props.setImageEditorCropBounds(
			canvas.offsetTop - canvas.offsetHeight / 2,
			canvas.offsetLeft - canvas.offsetWidth / 2,
			canvas.offsetTop + canvas.offsetHeight / 2,
			canvas.offsetLeft + canvas.offsetWidth / 2 );

		const context = canvas.getContext( '2d' );

		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.save();

		//setTransform() could be replaced with translate(), but it leads to
		//a false positive warning from eslint rule wpcalypso/i18n-no-variables
		context.setTransform( 1, 0, 0, 1, canvas.width / 2, canvas.height / 2 );

		context.scale( this.props.scaleX, this.props.scaleY );
		context.rotate( this.props.degrees * Math.PI / 180 );

		context.drawImage( this.image, -imageWidth / 2, -imageHeight / 2 );

		context.restore();
	},

	preventDrag( event ) {
		event.preventDefault();
		return false;
	},

	renderCrop() {
		if ( ! this.props.src ) {
			return;
		}

		return ( <Crop /> );
	},

	render() {
		return (
			<div className="editor-media-modal-image-editor__canvas-container">
				{ this.renderCrop() }
				<canvas
					ref="canvas"
					onMouseDown={ this.preventDrag }
					className="editor-media-modal-image-editor__canvas" />
			</div>
		);
	}
} );

export default connect(
	( state ) => {
		const { degrees, scaleX, scaleY } = getImageEditorTransform( state ),
			{ src, mimeType } = getImageEditorFileInfo( state ),
			{ topRatio, leftRatio, widthRatio, heightRatio } = getImageEditorCrop( state );

		return {
			src,
			mimeType,
			degrees,
			scaleX,
			scaleY,
			cropTopRatio: topRatio,
			cropLeftRatio: leftRatio,
			cropWidthRatio: widthRatio,
			cropHeightRatio: heightRatio
		};
	},
	{ setImageEditorCropBounds },
	null,
	{ withRef: true }
)( MediaModalImageEditorCanvas );
