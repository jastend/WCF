<?php
namespace wcf\system\package\validation;
use wcf\system\SingletonFactory;
use wcf\data\package\Package;

/**
 * Manages recursive validation of package archives.
 * 
 * @author	Alexander Ebert
 * @copyright	2001-2014 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 * @package	com.woltlab.wcf
 * @subpackage	system.package.validation
 * @category	Community Framework
 */
class PackageValidationManager extends SingletonFactory {
	/**
	 * package validation archive object
	 * @var	\wcf\system\package\validation\PackageValidationArchive
	 */
	protected $packageValidationArchive = null;
	
	/**
	 * virtual package list containing package => packageVersion
	 * @var	array<string>
	 */
	protected $virtualPackageList = array();
	
	/**
	 * Validates given archive for existance and ability to be installed/updated
	 * 
	 * @param	string		$archive
	 * @return	boolean
	 */
	public function validate($archive) {
		$this->virtualPackageList = array();
		$this->packageValidationArchive = new PackageValidationArchive($archive);
		
		return $this->packageValidationArchive->validate();
	}
	
	/**
	 * Returns package validation archive object.
	 * 
	 * @return	\wcf\system\package\validation\PackageValidationArchive
	 */
	public function getPackageValidationArchive() {
		return $this->packageValidationArchive;
	}
	
	/**
	 * Adds a virtual package with the corresponding version, if the package is already known,
	 * the higher version number will be stored.
	 * 
	 * @param	string		$package
	 * @param	string		$packageVersion
	 * @return	boolean
	 */
	public function addVirtualPackage($package, $packageVersion) {
		if (isset($this->virtualPackageList[$package])) {
			if (Package::compareVersion($packageVersion, $this->virtualPackageList[$package], '<')) {
				return false;
			}
		}
		
		$this->virtualPackageList[$package] = $packageVersion;
		
		return true;
	}
	
	/**
	 * Returns the version number of a virtual package or null if it doesn't exist.
	 * 
	 * @param	string		$package
	 * @return	string
	 */
	public function geVirtualPackageVersion($package) {
		if (isset($this->virtualPackageList[$package])) {
			return $this->virtualPackageList[$package];
		}
		
		return null;
	}
}